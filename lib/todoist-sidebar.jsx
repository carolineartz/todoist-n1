import {
  React,
  FocusedContentStore,
} from 'nylas-exports';
const {BrowserWindow} = remote;
const request = require('superagent');
const store = require('store2')
const config = require('./config.json')

export default class TodoistSidebar extends React.Component {
  static displayName = 'TodoistSidebar';

  constructor(props) {
    super(props);
    this.options = {
      redirect_uri: config.redirect_uri,
      client_id: config.client_id,
      client_secret: config.client_secret,
      scope: ['data:read_write'],
    };
    this.authWin = null;
    this.state = this._getStateFromStores();
  }

  componentDidMount() {
    this.unsubscribe = FocusedContentStore.listen(this._onChange);
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  _getStateFromStores() {
    return {
      thread: FocusedContentStore.focused('thread'),
    };
  }
  _onChange = () => {
    this.setState(this._getStateFromStores());
  }


  // Plugin logic code
  // ------------------------
  _loginTodoist = () => {
    var url = 'https://todoist.com/oauth/authorize?client_id=' + this.options.client_id + '&scope=' + this.options.scope;

    this.authWin = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
    });
    this.authWin.loadURL(url);
    this.authWin.once('ready-to-show', () => {
      this.authWin.show();
    });
    this.authWin.webContents.on('did-get-redirect-request', this.handleResponse);
  }

  handleResponse = (ev, oldUrl, newUrl) => {
    var rcode = /code=([^&]*)/.exec(newUrl);
    if (!rcode) {
      return;
    }
    rcode = rcode[1];

    request
      .post('https://todoist.com/oauth/access_token')
      .send({
        client_id: this.options.client_id,
        client_secret: this.options.client_secret,
        code: rcode,
        redirect_uri: this.options.redirect_uri,
      })
      .set('Content-Type','application/x-www-form-urlencoded')
    .end((err, res) => {
        if (err || !res.ok) {
            alert('Failed to get access to Todoist app!');
            console.log(err);
            return;
        }
        // We got the access token!
        this.accessToken = res.body.access_token;
        store('accessToken', this.accessToken);
        this.authWin.destroy();
        this._onChange();
    });
  }

  _rand() {
      return Math.floor(1000*Math.random()).toString();
  }
  _randID() {
      return this._rand() + "-" + this._rand() + "-" + this._rand() + "-" + this._rand() + "-" + this._rand();
  }
  _addTask = () => {
    var taskDate = document.getElementById('taskDate').value;
    var taskName = document.getElementById('taskName').value;
    var command = [{
        type: "item_add",
        temp_id: this._randID(),
        uuid: this._randID(),
        args: {
            content: taskName,
            date_string: taskDate
        }
    }];
    var payload = {token: this.accessToken, commands: JSON.stringify(command)};
    request
      .post('https://todoist.com/API/v7/sync')
      .send(payload)
      .set('Content-Type','application/x-www-form-urlencoded')
      .end((err, res) => {
        if (err || !res.ok) {
            alert('Failed to add new task!');
            console.log(err);
            return;
        }
      });
  }
  _logoutTodoist = () => {
      store.remove('accessToken');

      this._onChange();
  }

  // Plugin render code
  // ------------------------
  _renderLogin() {
    return (
      <div className='button' onClick={this._loginTodoist}>Login to Todoist</div>
    );
  }

  _renderAdd = () => {
    return (
      <div>
        <input className='textBox' type='text' id='taskName' defaultValue={this.state.thread.subject}/>
        <input className='textBox' type='text' id='taskDate' defaultValue='today'/>
        <div className='button' onClick={this._addTask}>Add task</div>
        <p className="gray"><a onClick={this._logoutTodoist}>Log Out</a></p>
      </div>
    );
  }

  render() {
    this.accessToken = store('accessToken');
    var content = '';
    if (this.accessToken === '' || this.accessToken === null) {
      content = this._renderLogin();
    } else {
      content = this._renderAdd();
    }

    return (
      <div className = 'todoist-sidebar' >
      {content}
    </div>
    );
  }
}

TodoistSidebar.containerStyles = {
  order: 1,
  flexShrink: 0,
};
