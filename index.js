const isReleased = true;

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
// 게임 진행 여부
let isStart = false;
let seconds = 15; //75
// 순위
const ranker = [];


const freezeInterval = (time => {
    console.log('freezeInterval', Math.random());

    // 종료
    if (seconds <= 0) {
        io.emit('ending', ranker);
        return;
    }

    io.emit('freeze', true);
    setTimeout(() => {
        if (isStart) io.emit('freeze', false);
        setTimeout(freezeInterval, time, time);
    }, 2000);
});

const timeInterval = (time => {
    console.log('timeInterval', seconds);

    if (seconds <= 0) return;

    setTimeout(() => {
        //io.emit('freeze', false);
        if (isStart) {
            seconds--;
        }
        io.emit('runtime', seconds);
        setTimeout(timeInterval, time, time);
    });
});

(() => {
    freezeInterval(4000);
    timeInterval(1000);
})();


/**
 * uid 없는 소켓은 연결할 수 없다
 */
io.use((socket, next) => {
    if ('uid' in socket.handshake.query) {
        next();
    } else {
        next(new Error('bye'));
    }
});


/**
 * 같은 이름의 접속자 발생 시 이전 접속자 종료
 * @param socket
 */
const reconnect = socket => {
    for (let user of usersInfo) {
        if (user.uid === socket.handshake.query.uid
                && user.info.connect) {
            users[user.info.name].disconnect();
        }
    }
};

io.on('connection', socket=>{

    console.log('connection handshake..' , socket.handshake);

    if (isReleased) reconnect(socket);

    // 참가자 정보
    socket.handshake.query.info = {
        connect: true,
        name: socket.id,
        index: pos++,
        count: 0,
        die: false,
        rank: 0
    }

    // 참가자 저장
    users[socket.id] = socket;
    usersInfo.push(socket.handshake.query);

    console.log('connection!!!' , socket.handshake.query);

    touchMax = touchMax + 1000;

    // 메시지
    /*
    socket.on('message',data => {
        io.emit('message', data);
        io.emit('touchMax', touchMax);
    });
     */
    // 터치
    socket.on('touch',data => {

//        socket.handshake.query.info.count = socket.handshake.query.info.count + 0.1;
        socket.handshake.query.info.count = socket.handshake.query.info.count + 10;
        // socket.handshake.query.info.count = socket.handshake.query.info.count + 3;

        // count > 79 = 랭커
        if (socket.handshake.query.info.count >= 79
                && ranker.length <= 3) {

            const scInfo = socket.handshake.query;
            let isNotContain = true;
            // 중복 방지
            for (let item of ranker) {
                if (item.uid === scInfo.uid) {
                    isNotContain = false;
                    break;
                }
            }
            if (isNotContain) {
                socket.handshake.query.info.rank = ranker.length + 1;
                ranker.push(socket.handshake.query);
                socket.emit('pass', ranker);
            }

            // 3명 통과하면 종료
            if (ranker.length >= 3) {//3
                seconds = 0;
                io.emit('ending', ranker);
            }

        }

        io.emit('info', usersInfo);

        // touchMax = touchMax - 1;
        // io.emit('touchMax', touchMax);
    });
    // 참가자 탈락
    socket.on('die', data => {
        console.log('socket disconn >>> ' , data);

        socket.handshake.query.info.die = true;

        io.emit('info', usersInfo);
    });
    // 게임 진행 여부
    socket.on('start', data => {

        console.log('start >>> ' , isStart);

        if (data === 'Dan') isStart = !isStart;
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