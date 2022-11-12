const root = ReactDOM.createRoot(document.getElementById('root'))
const element = React.createElement

const token = JSON.parse(sessionStorage.getItem('userObject'))

if (!token) {
  root.render(element(Login))
} else {
  const socket = io()
  root.render(element(Chat, { socket, token }))
}

// ------------------- Login component ------------------- //

function Login() {
  const [notification, setNotification] = React.useState('Log in to continue...')

  const requestToken = async (username, password) => {
    const request = new Request(location.href.concat('login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password})
    })

    try {
      const response = await fetch(request)
      const userObject = await response.json()
      if (userObject.error) {
        throw new Error(userObject.error)
      } else if (userObject.token) {
        sessionStorage.setItem('userObject', JSON.stringify(userObject))
      }
      return userObject.token
    }
    catch (err) {
      setNotification('Error: ' + err.message)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    let username = document.forms['login'].elements.username.value
    let password = document.forms['login'].elements.password.value
    
    let token = await requestToken(username, password)
    if (token) {
      location.reload()
    }
    return token
  }

  return element(
    'form', {
      name: 'login',
      onSubmit: handleLogin 
    },
    element('input', {
      name: 'username',
      placeholder: 'username'
    }),
    element('input', {
      type: 'password',
      name: 'password',
      placeholder: 'password'
    }),
    element('button', {
      type: 'submit',
      style: { backgroundColor: '#61dbfb' }
    }, 'Connect'),
    element('p', {}, notification)
  )
}

// ------------------- Chat Component ------------------- //

const initialState = {
  users: [],
  messages: {
    current: { 
      text: 'Welcome to React Chat!',
      user: '', id: 0 
    },
    previous: []
  }
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'new message':
      return {
        ...state, 
        messages: {
          current: action.payload,
          previous: [ 
            state.messages.current,
            ...state.messages.previous
          ]
        },
      }
    case 'new userlist':
      return {
        ...state,
        users: action.payload
      }
    default:
      throw new Error('invalid action')
  }
}

function Chat({ socket, token }) {
  const [state, dispatch] = React.useReducer(reducer, initialState)

  // Listeners:

  React.useEffect(() => {
    socket.on('message', (msg) => {
      dispatch({
        type: 'new message',
        payload: msg
      })
    })
    socket.on('users', (data) => {
      dispatch({
        type: 'new userlist',
        payload: data.users
    })
  })
  }, [])

  // Child Components:

  const Form = () => {
    const [userInput, setUserInput] = React.useState('')

    const handleLogout = () => {
      socket.emit('logout', { user: token.username }).disconnect()
      sessionStorage.clear()
      location.reload()
      return false
    }

    const handleSubmit = (event) => {
      event.preventDefault()
      if (userInput.length < 1) {
        return
      }
      socket.emit('message', { 
        text: userInput, 
        user: token.username,
        id: new Date().getTime()
      })
      setUserInput('')
    }

    return element('form', { onSubmit: handleSubmit }, 
      element('input', {
        name: 'message',
        style: { width: '50%' },
        placeholder: 'Have your say...',
        value: userInput,
        onChange: ({ target }) => setUserInput(target.value)
      }), 
      element('button', { 
        type: 'submit',
        style: { backgroundColor: '#61dbfb' }
      }, 'Send'),
      element('button', { 
        id: 'logout',
        onClick: handleLogout
      }, 'Logout')
    )
  }

  const windowStyles = {
    border: '2px solid #666', 
    borderRadius: '9px',
    fontSize: 'medium',
    padding: '0.5rem 0', 
    backgroundColor: '#111',
    position: 'fixed', width: '65vw',
    marginRight: '1rem', left: '5vw',
    top: '13.5rem', bottom: '56px',
    overflowY: 'auto'
  }

  const UserList = ({ users }) => {
    return element('div', {
      style: { fontSize: 'medium', 
        backgroundColor: '#333',
        position: 'fixed', 
        right: '3vw', width: '23vw',
        top: '14.25rem',
      }
    },
      element('ul', {},
      element('li', { className: 'blue' }, 'Users online:'),
        users.map((user) => {
          return element('li', { key: user }, user)
        })
      )
    )
  }

  const ChatWindow = ({ messages }) => {
    return element('div', { className: 'window', style: windowStyles },
      element('ul', {},
      element('li', { className: 'featured' },
      element('div', { className: 'blue' }, messages.current.user),
        element('div', {}, messages.current.text)
      ),
        messages.previous.map((msg) => {
          return element('li', { className: 'msg-text', key: msg.id },
          element('div', { className: 'blue' }, msg.user),
          element('div', {}, msg.text)
          )
        })
      )
    )
  }

  return element('div', {},
    element(Form, {}),
    element('div', {},
      element(ChatWindow, { messages: state.messages }),
      element(UserList, { users: state.users })
    ),
  )
}
