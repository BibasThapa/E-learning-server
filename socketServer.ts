import {Server as SockerIOServer} from "socket.io"
import http from 'http';

export const initSocketServer = (server: http.Server) =>{
    const io = new SockerIOServer(server);

    io.on("connection", (socket)=>{
        console.log('A user connected');

        socket.on("notification",(data)=>{
            io.emit("newNotificaton", data)
        });
        socket.on("disconnect",()=>{
            console.log("A user disconnected")
        })
    })
}