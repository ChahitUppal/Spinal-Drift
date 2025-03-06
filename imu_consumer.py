import json
from channels.generic.websocket import AsyncWebsocketConsumer

# Global mapping from ID to the most recent data
id_to_data = {}


class IMUUploadConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.id = self.scope["url_route"]["kwargs"]["id"]
        await self.accept()
        await self.send(
            text_data=json.dumps({"message": "Connected to IMU Upload Consumer"})
        )

    async def disconnect(self, close_code):
        print(f"IMU Upload Consumer {self.id} disconnected (code: {close_code})")

    async def receive(self, text_data):
        global id_to_data

        data = json.loads(text_data)
        id_to_data[self.id] = data

        # Send this data to the group named for this specific ID
        await self.channel_layer.group_send(
            f"imu_broadcast_group_{self.id}",
            {
                "type": "send_data",
                "data": data,
            },
        )

        await self.send(text_data=json.dumps({"message": "Data received and stored"}))


class IMUBroadcastConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.id = self.scope["url_route"]["kwargs"]["id"]

        await self.accept()

        # If this ID has never uploaded data, disconnect immediately
        if self.id not in id_to_data:
            await self.send(text_data=json.dumps({"error": f"Invalid ID: {self.id}"}))
            await self.close()
            return

        # Add this connection to the group dedicated to this ID
        await self.channel_layer.group_add(
            f"imu_broadcast_group_{self.id}", self.channel_name
        )

        await self.send(
            text_data=json.dumps({"message": "Connected to IMU Broadcast Consumer"})
        )

        # If data already exists for this ID, send it immediately
        latest_data = id_to_data.get(self.id)
        if latest_data is not None:
            await self.send(text_data=json.dumps({"data": latest_data}))

    async def disconnect(self, close_code):
        # Remove the connection from the dedicated group
        await self.channel_layer.group_discard(
            f"imu_broadcast_group_{self.id}", self.channel_name
        )
        print(f"IMU Broadcast Consumer {self.id} disconnected (code: {close_code})")

    async def send_data(self, event):
        """Handler to forward the latest data to subscribers in this ID’s group."""
        data = event["data"]
        await self.send(text_data=json.dumps({"data": data}))
