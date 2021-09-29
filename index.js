const cors = require('cors');
const io = require('socket.io')(require('http').createServer(require('express')()).listen(80),{
    cors : {
        origin :"*",
        credentials :true
    }
});

let touchMax = 100000;
let users = {}; // 참가자
let usersInfo = []; // 참가자 정보
let pos = 0; // 라인번호

let freezeTime = 3000;
let isFreeze = false;

const freezeInterval = (time => {
    console.log('freezeInterval', Math.random());

    io.emit('freeze', true);
    setTimeout(() => {
        io.emit('freeze', false);
        setTimeout(freezeInterval, time, time);
    }, 3000);
});

(() => {
    /*
    setInterval(() => {
        console.log('ok');
    },freezeTime);
    */
    freezeInterval(6000);
})();






io.on('connection', socket=>{


    // 참가자 정보
    socket.handshake.query.info = {
        connect: true,
        name: socket.id,
        index: pos++,
        count: 0,
        die: false
    }

    // 참가자 저장
    users[socket.id] = socket;
    usersInfo.push(socket.handshake.query);

    console.log('connection!!!' , socket.handshake.query);

    touchMax = touchMax + 1000;

    // 메시지
    socket.on('message',data => {
        io.emit('message', data);
        io.emit('touchMax', touchMax);
    });
    // 터치
    socket.on('touch',data => {

        socket.handshake.query.info.count = socket.handshake.query.info.count + 0.1;

        io.emit('info', usersInfo);

        touchMax = touchMax - 1;
        io.emit('touchMax', touchMax);
    });
    // 참가자 탈락
    socket.on('die', data => {
        console.log('socket disconn >>> ' , data);

        socket.handshake.query.info.die = true;

        io.emit('info', usersInfo);
    });
    // 참가자 수
    io.emit('users', io.engine.clientsCount);
    // 참가자 입장
    io.emit('enter', socket.handshake.query.info);
    // 참가자 전체 정보
    io.emit('info', usersInfo);
    // 참가자 퇴장
    socket.on('disconnect', (socket,a,b,c)=>{
        console.log('disconnect!!!' , socket, io.sockets.sockets);

        /*
        for(let soc of io.sockets.sockets) {
            console.log( 's >>> ' , soc )
        }
        */

        for(let user in users) {
            console.log( user + " >>>" + users[user].disconnected)
            if (users[user].disconnected) {
                console.log( 'dis user >>> ' , users[user].handshake.query.info )
                // 참가자 퇴장
                usersInfo[ users[user].handshake.query.info.index ].info.connect = false;
                io.emit('leave', users[user].handshake.query.info);
            }
        }

        // 참가자 수
        io.emit('users', io.engine.clientsCount);
    });
});