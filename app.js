const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require("socket.io")
const io = new Server(server)

app.use(express.json())
app.use(express.static('public'))

const userList = new Set()

app.post('/login', (req, res) => {
  const { username, password } = req.body
  if (username && password === 'test') {
    console.log('user authenticated')
    userList.add(username)

    res.status(200).send({
      username,
      token: true
    })
  } else {
    console.log('login attempt rejected')
    res.status(401).json({ error: 'login error' })
  }
})

io.on('connection', (socket) => {
  console.log('user connected')
  console.log('users:', userList)
  io.emit('users', {users: [...userList.values()]})
  
  socket.on('message',(data) => {
    console.log('message received:', data)
    io.emit('message', data)
  })

  socket.on('logout', (data) => {
    console.log('logout', data)
    userList.delete(data.user)
    io.emit('users', {users: [...userList.values()]})
  })

  socket.on('disconnect', (data) => {
    console.log('user disconnected:', data)
    console.log('users:', userList)
  })
})

server.listen(3030, () => {
  console.log('Server listening on port 3030')
})