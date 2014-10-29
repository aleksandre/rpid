var fs = require('fs');
var winston = require('winston');
var config = require('./config.js');
var EventEmitter = require('events').EventEmitter;

function BasePlayer(options) {
	winston.info("BasePlayer is initializing");
	this.init(options || {});
	this.bindEvents();
};

BasePlayer.prototype = {

	__proto__: EventEmitter.prototype,

	constructor: BasePlayer,

	init: function (options) {

		this.playerName = "BasePlayer";

		this.allCommands = {
			'play': this.onStartedPlaying.bind(this),
			'stop': this.onStopped.bind(this),
			'pause': this.onPaused.bind(this),
			'resume': this.onStartedPlaying.bind(this)
		};

		this.allStates = {
			'Waiting': 'Waiting',
			'Playing': 'Playing',
			'Paused': 'Paused',
			'Stopped': 'Stopped'
		};

		this.allEvents = {
			'onPlayerStopped': 'onPlayerStopped',
			'onPlayerLoadedMedia': 'onPlayerLoadedMedia',
			'onPlayerStartedPlaying': 'onPlayerStartedPlaying',
			'onPlayerPaused': 'onPlayerPaused'
		};
		this.watcherID = -1;
		this.currentMedia = '';
		this.queue = options.queue || [];
		this.queueCurrentIdx = options.queueCurrentIdx || 0;
		this.state = options.state || this.allStates.Waiting;
	},

	bindEvents: function () {
		winston.info('Player is binding to 3rd party player events');
	},

	unbindEvents: function () {

	},

	getState: function () {
		var state = {
			"player_impl": 'DummyPlayer',
			"player_state": this.state,
			"queue_current_item": this.getCurrentMedia(),
			"queue_length": this.queue.length,
			"queue_item_position": this.queue.length === 0 ? 0 : this.queueCurrentIdx + 1,
			"queue_content": this.queue
		};
		winston.info('Player state is: ', this.state);
		return state;
	},

	getCurrentMedia: function () {
		return this.currentMedia;
	},

	play: function (mediaURL) {
		if (typeof mediaURL === "string") {
			winston.info('Player is creating a new queue and playing the file: <%s>', mediaURL);
			this.stop();
			this.clearQueue();
			this.queueOneItem(mediaURL);
			return this._sendPlayCmd(mediaURL);
		} else if (mediaURL instanceof Array) {
			winston.info('Player is creating a new queue and playing the files: <%s>', mediaURL);
			this.stop();
			this.clearQueue();
			this.queueOneItem(mediaURL);
			return this._sendPlayCmd(mediaURL);
		} else if (this.queue[this.queueCurrentIdx] !== undefined) {
			winston.info('Player is starting to play the current track in the queue: <%s>', this.queue[this.queueCurrentIdx]);
			return this._sendPlayCmd(this.queue[this.queueCurrentIdx]);
		} else {
			winston.info("Player rejected play request because no track was specified and the queue is empty");
			return new Error("Player: FileNotFound")
		}
	},

	start: function ()  {
		winston.info('Player has started');
		this._watchThirdPartyPlayer('play');
	},

	stop: function ()  {
		winston.info('Player has sent a stop request to 3rd party player');
		this._sendCmdToThirdPartyPlayer('stop');

		winston.info('Player stopped watching 3rd party player');
		this._stopWatchingThirdPartyPlayer();
	},

	pause: function ()  {
		winston.info('Player has sent a pause request to 3rd party player');
		this._sendCmdToThirdPartyPlayer('pause');
	},

	resume: function ()  {
		winston.info('Player has sent a resume request to 3rd party player');
		this._sendCmdToThirdPartyPlayer('play');
	},

	queueOneItem: function (jsonQueueItem)  {
		if (jsonQueueItem) {
			winston.info("Player added a new item to the queue");
			this.queue.push(unescape(jsonQueueItem));
		} else {
			winston.info("Player did not queue the new item because it is empty");
		}
	},

	queueItemCollection: function (jsonQueueItems)  {
		if (jsonQueueItems instanceof Array) {
			jsonQueueItems.forEach((function (item) {
				this.queueOneItem(item);
			}).bind(this));
		} else {
			winston.info("Player did not queue the new item because it is not an Array");
		}
	},

	clearQueue: function ()  {
		winston.info("Player has cleared it's play queue");
		this.queue = [];
		this.queueCurrentIdx = 0;
	},

	playNext: function ()  {
		if (this.queueCurrentIdx < this.queue.length) {
			winston.info('Player Queue length is <%d>', this.queue.length);
			this.queueCurrentIdx = this.queueCurrentIdx + 1;
			var media = this.queue[this.queueCurrentIdx];
			winston.info("Player is playing item <%s> at position <%d> from the queue", media, this.queueCurrentIdx);
			this._sendPlayCmd(media);
		} else {
			winston.info("Player received a playNext request bust has no next track to play");
		}
	},

	playPrevious: function ()  {
		if (this.queueCurrentIdx > 0) {
			this.queueCurrentIdx = this.queueCurrentIdx - 1;
			var media = this.queue[this.queueCurrentIdx];
			winston.info("Player is playing item <%s> at position <%d> from the queue", media, this.queueCurrentIdx);
			this._sendPlayCmd(media)
		} else {
			winston.info("Player has no previous track to play", this.playerName);
		}
	},

	volumeUp: function ()  {
		winston.info('Player has sent 3rd party player a request to increase the volume');
		this._sendCmdToThirdPartyPlayer('volup');
	},

	volumeDown: function ()  {
		winston.info('Player has sent 3rd party player a request to decrease the volume');
		this._sendCmdToThirdPartyPlayer('voldown');
	},

	onLoaded: function (files, options) {
		winston.info("Player has loaded files into 3rd party player");
		this.state = this.allStates.Paused;
		this.emit(this.allEvents.onPlayerLoadedMedia);
	},

	onStopped: function () {
		winston.info("Player has stopped playing");
		this.state = this.allStates.Stopped;
		this.emit(this.allEvents.onPlayerStopped);
		this.playNext();
	},

	onStartedPlaying: function () {
		winston.info("Player has started playing");
		this.state = this.allStates.Playing;
		this.emit(this.allEvents.onPlayerStartedPlaying);
	},

	onPaused: function () {
		winston.info("Player has paused");
		this.state = this.allStates.Paused;
		this.emit(this.allEvents.onPlayerPaused);
	},

	_getThirdPartyPlayerState: function ()  {
		return {
			'state': this.state
		};
	},

	_watchThirdPartyPlayer: function () {
		this.watcherID = setInterval((function () {
			var state = this._getThirdPartyPlayerState();
			//if (state && 'loaded' in state && !state.loaded) {
			//}
			// Do something!

		}).bind(this), 1000);
	},

	_stopWatchingThirdPartyPlayer: function () {
		if (this.watcherID !== -1) {
			clearInterval(this.watcherID);
			this.watcherID = -1;
		}
	},

	_sendPlayCmd: function (mediaURL) {
		if (mediaURL) {
			if (!(fs.existsSync(mediaURL))) {
				return new Error('Player: FileNotFound');
			}
			winston.info('Player has sent a play request for file <%s> to 3rd party player', mediaURL);
			this.currentMedia = mediaURL;
			return this._sendCmdToThirdPartyPlayer('play', this.currentMedia);
		} else {
			return new Error('Player: NoMediaURLSpecified');
		}
	},

	_sendCmdToThirdPartyPlayer: function (cmd, args) {
		args = args || null;
		if (cmd in this.allCommands) {
			var fn = this.allCommands[cmd];
			fn.call(args)
			winston.info('Player has sent cmd <%s> to 3rd party', cmd);
			return true;
		} else {
			winston.error('Player has no command for cmd <%s> ', cmd);
			return new Error('Player: CommandNoFound');
		}
	}
}

/**
 * Player Impl Factory
 *
 * Return the media_service implementation configured for the specified or current environnement (process.env.NODE_ENV).
 */
function getPlayer(env) {
	env = env || process.env.NODE_ENV;

	if (!(env in config.players)) {
		winston.error("getPlayer: No player defined for env <%s>", env);
		throw new Error("getPlayer: NoPlayerForEnv");
	}
	var player = config.players[env];
	winston.info('getPlayer: returning impl for player <%s> ', player);
	switch (player) {
	case 'base':
		return BasePlayer;
	case 'omxdirector ':
		return require('. / player_omx.js ');
	default:
		throw new Error("getPlayer: The section player in config.js is pointing to an unknown player type: ", player)
	}
};

exports.BasePlayer = BasePlayer;
exports.getPlayer = getPlayer;