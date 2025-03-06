import asyncio
import json
import websockets


async def send_imu_data(imu_id: str, data: dict, host: str):
    # Construct the websocket URL
    ws_url = f"wss://{host}/api/ws/imu/{imu_id}/upload/"

    print(f"Connecting to {ws_url}...")
    async with websockets.connect(ws_url) as websocket:
        # Convert Python dictionary to JSON string
        message = json.dumps(data)

        print(f"Sending data: {message}")
        await websocket.send(message)

        # Optionally receive a response from the server
        response = await websocket.recv()
        print(f"Received from server: {response}")


async def main():
    # Example usage:
    # Replace "my_imu_id" with your desired IMU ID from the URL route
    # and change the data payload as needed.
    imu_id = "my_imu_id"
    data_payload = {
        "accelerometer": {"x": 0.12, "y": -0.98, "z": 1.23},
        "gyroscope": {"x": 1.0, "y": 2.0, "z": 3.0},
        "timestamp": 167768051733,
    }

    await send_imu_data(
        imu_id, data_payload, host="personal-site-oi5a.onrender.com"
    )


if __name__ == "__main__":
    asyncio.run(main())
