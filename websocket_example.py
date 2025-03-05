import asyncio
import websockets
import json

WS_URL = "wss://personal-site-oi5a.onrender.com/api/ws/ping/"

async def websocket_client():
    async with websockets.connect(WS_URL) as websocket:
        # Create payload
        connect_response = await websocket.recv()
        print(f"Received connect response: {connect_response}")

        payload = json.dumps({"image": "test"})

        # Send data
        await websocket.send(payload)
        print("Message sent")

        # Receive response
        response = await websocket.recv()

        print(f"Received response: {response}")
        

# Run the client
asyncio.run(websocket_client())
