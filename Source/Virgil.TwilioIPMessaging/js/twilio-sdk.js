/** @license
 twilio-rtc-ip-messaging.js v0.5 (0.5.6.b1-72a468a)

 Copyright (c) 2015 Twilio, Inc. All rights reserved. <https://twilio.com>

 THIS SOFTWARE IS PROVIDED BY THE AUTHOR "AS IS" AND ANY EXPRESS OR IMPLIED
 WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
 OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY
 OF SUCH DAMAGE.

 */

(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
    'use strict';

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;

    var Member = require('./member');
    var Message = require('./message');


    /**
     * @class
     * @classdesc A Channel represents a Channel the Client knows about.
     * @property {Object} attributes - A JSON object containing custom attributes.
     * @property {Boolean} isPrivate - Whether the channel is private (as opposed to public).
     * @property {String} friendlyName - The user-defined identifier for this Channel.
     * @property {Map<Identity, Member>} members - A map of Members in the Channel.
     * @property {String} sid - The Channel's unique identifier.
     * @property {String} status - The state of the Channel relative to the Client.
     * @fires Channel#updated
     * @fires Channel#messageAdded
     * @fires Channel#memberJoined
     * @fires Channel#memberLeft
     */
    function Channel(entity) {
        if (!(this instanceof Channel)) {
            return new Channel(entity);
        }

        var members = new Map();
        var membersPromise = null;
        var messagesPromise = null;

        Object.defineProperties(this, {
            _entity: { value: entity },
            _membersPromise: {
                get: function() {
                    membersPromise = membersPromise || entity.getMembers().then(listenForMembers);
                    return membersPromise;
                }
            },
            _messagesPromise: {
                get: function() {
                    messagesPromise = messagesPromise || entity.getMessages().then(listenForMessages);
                    return messagesPromise;
                }
            },
            attributes: {
                enumerable: true,
                get: entity.getAttributes.bind(entity)
            },
            friendlyName: {
                enumerable: true,
                get: entity.getName.bind(entity)
            },
            isPrivate: {
                enumerable: true,
                get: entity.isPrivate.bind(entity)
            },
            members: {
                enumerable: true,
                value: members
            },
            sid: {
                enumerable: true,
                value: entity.getId()
            },
            status: {
                enumerable: true,
                get: function() {
                    switch(true) {
                        case entity.isJoined():
                            return Channel.status.JOINED;
                        case entity.isInvited():
                            return Channel.status.INVITED;
                        default:
                            return Channel.status.KNOWN;
                    }
                }
            }
        });

        var self = this;
        function listenForMessages(messagesEntity) {
            messagesEntity.on('messageAdded', function(messageEntity) {
                self.emit('messageAdded', new Message(messageEntity));
            });

            return messagesEntity;
        }

        function listenForMembers(membersEntity) {
            membersEntity.on('memberJoined', function(memberEntity) {
                var member = new Member(self, memberEntity);
                members.set(member.identity, member);
                self.emit('memberJoined', member);
            });

            membersEntity.on('memberLeft', function(memberIdentity) {
                var member = members.get(memberIdentity);
                members.delete(memberIdentity);
                self.emit('memberLeft', member);
            });

            return membersEntity;
        }

        if (entity.isJoined()) {
            this._subscribe();
        }

        entity.on('updated', function() {
            self.emit('updated', self);
        });

        EventEmitter.call(this);
    }

    inherits(Channel, EventEmitter);

    Channel.status = {
        KNOWN: 'known',
        INVITED: 'invited',
        JOINED: 'joined'
    };

    Channel.prototype._subscribe = function _subscribe() {
        return this._membersPromise.then(function() {
            return this._messagesPromise;
        }.bind(this));
    };

    /**
     * Add a user to the Channel by their Identity.
     * @param {String} identity - Identity of the user to add.
     * @returns {Promise}
     */
    Channel.prototype.add = function addByIdentity(identity) {
        if (typeof identity !== 'string' || !identity.length) {
            return Promise.reject(new Error('Channel.invite requires an <String>identity parameter'));
        }

        return this._membersPromise.then(function(membersEntity) {
            return membersEntity.add(identity);
        });
    };

    /**
     * Decline an invitation to the Channel.
     * @returns {Promise<Channel>}
     */
    Channel.prototype.decline = function declineChannel() {
        var self = this;
        return this._entity.decline().then(function() { return self; });
    };

    /**
     * Delete the Channel.
     * @returns {Promise<Channel>}
     */
    Channel.prototype.delete = function deleteChannel() {
        var self = this;
        return this._entity.destroy().then(function() { return self; });
    };

    /**
     * Invite a user to the Channel by their Identity.
     * @param {String} identity - Identity of the user to invite.
     * @returns {Promise}
     */
    Channel.prototype.invite = function inviteByIdentity(identity) {
        if (typeof identity !== 'string' || !identity.length) {
            return Promise.reject(new Error('Channel.invite requires an <String>identity parameter'));
        }

        return this._membersPromise.then(function(membersEntity) {
            return membersEntity.invite(identity);
        });
    };

    /**
     * Get the Members of this Channel.
     * @returns {Promise<Array<Member>>}
     */
    Channel.prototype.getMembers = function getMembers() {
        var self = this;

        return this._membersPromise.then(function(membersEntity) {
            return membersEntity.getMembersList();
        }).then(function(memberEntities) {
            var members = memberEntities.map(Member.bind(null, self));

            members.forEach(function(member) {
                self.members.set(member.identity, member);
            });

            return members;
        });
    };

    /**
     * Get a number of Messages from this Channel.
     * @param {Number} count - Number of messages to return
     * @param {String} [anchor='end'] - Most early message id which is already known, or 'end'
     * @returns {Promise<Array<Message>>}
     */
    Channel.prototype.getMessages = function getMessages(count, anchor) {
        return this._messagesPromise.then(function(messagesEntity) {
            return messagesEntity.getMessages(count, anchor || 'end');
        }).then(function(messageEntities) {
            return messageEntities.map(Message);
        });
    };

    /**
     * Join the Channel.
     * @returns {Promise<Channel>}
     */
    Channel.prototype.join = function joinChannel() {
        var self = this;
        return this._subscribe().then(function() {
            return self._entity.join().then(function() { return self; });
        });
    };

    /**
     * Leave the Channel.
     * @returns {Promise<Channel>}
     */
    Channel.prototype.leave = function leaveChannel() {
        if (this.status !== Channel.status.JOINED) { return Promise.resolve(this); }

        var self = this;
        return this._entity.leave().then(function() { return self; });
    };

    /**
     * Remove a Member from the Channel.
     * @param {Member} member - The Member to remove.
     * @returns {Promise<Member>}
     */
    Channel.prototype.removeMember = function removeMember(member) {
        return this._membersPromise.then(function(membersEntity) {
            return membersEntity.remove(member.identity);
        }).then(function() { return member; });
    };

    /**
     * Send a Message on the Channel.
     * @param {String} messageBody - The message body.
     * @returns {Promise<String>} A Promise for the message ID
     */
    Channel.prototype.sendMessage = function sendMessage(messageBody) {
        return this._messagesPromise.then(function(messagesEntity) {
            return messagesEntity.send(messageBody);
        });
    };

    /**
     * Update the Channel's attributes.
     * @param {Object} - The new attributes object.
     * @returns {Promise<Channel>} A Promise for the Channel
     */
    Channel.prototype.updateAttributes = function updateAttributes(attributes) {
        var self = this;
        return this._entity.updateAttributes(attributes).then(function() {
            return self;
        });
    };

    /**
     * Update the Channel's friendlyName.
     * @param {Object} - The new Channel friendlyName.
     * @returns {Promise<Channel>} A Promise for the Channel
     */
    Channel.prototype.updateFriendlyName = function updateFriendlyName(name) {
        var self = this;
        return this._entity.updateName(name).then(function() {
            return self;
        });
    };

    Object.freeze(Channel);

    /**
     * Fired when the Channel's friendlyName or attributes have been updated.
     * @param {Channel} channel
     * @event Channel#updated
     */
    /**
     * Fired when a new Message has been added to the Channel on the server.
     * @param {Message} message
     * @event Channel#messageAdded
     */
    /**
     * Fired when a Member has joined the Channel.
     * @param {Member} member
     * @event Channel#memberJoined
     */
    /**
     * Fired when a Member has left the Channel.
     * @param {Member} member
     * @event Channel#memberLeft
     */

    module.exports = Channel;

},{"./member":4,"./message":5,"events":12,"util":47}],2:[function(require,module,exports){
    'use strict';

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;

    var Channel = require('./channel');
    var IPMessagingCore = require('twilio-ipmessaging-js-sdk');

    /**
     * @class
     * @classdesc A Client provides an interface for the local
     *   User to interact with Channels.
     *   The Client constructor will synchronously return an instance of
     *   Client, and will block any outgoing methods until it has
     *   asynchronously finished loading its data from the server.
     * @parameter {String} accessToken
     * @property {String} token - The AccessToken used to register this Client.
     * @fires Client#channelAdded
     * @fires Client#channelDeleted
     * @fires Client#channelInvited
     * @fires Client#channelJoined
     * @fires Client#channelLeft
     */
    function Client(token) {
        if (!token || token.split('.').length !== 3) {
            throw new Error('A valid Twilio Capability Token must be passed to IPMessaging Client');
        }

        if (!(this instanceof Client)) {
            return new Client(token);
        }

        var channels = new Map();
        var session = new IPMessagingCore(token);

        var self = this;
        var channelsPromise = session.getChannels().then(function(channelsEntity) {
            channelsEntity.on('channelAdded', function(channelSid, channelEntity) {
                var channel = self._addChannel(channelEntity);
                self.emit('channelAdded', channel);
            });

            channelsEntity.on('channelRemoved', function(channelSid) {
                var channel = self._channels.get(channelSid);
                self._channels.delete(channelSid);
                self.emit('channelDeleted', channel);
            });

            channelsEntity.on('channelInvited', function(channelSid) {
                self.getChannel(channelSid).then(function(channel) {
                    channel._entity._setState('invited');
                    self.emit('channelInvited', channel);
                });
            });

            channelsEntity.on('channelJoined', function(channelSid) {
                self._joinChannel(channelSid).then(function(channel) {
                    self.emit('channelJoined', channel);
                });
            });

            channelsEntity.on('channelLeft', function(channelSid) {
                var channel = self._channels.get(channelSid);
                channel._entity._setState('');
                self.emit('channelLeft', channel);
            });

            return channelsEntity.getPublicChannels()
                .then(function(publicChannelEntities) {
                    publicChannelEntities.forEach(function(channelEntity) {
                        self._addChannel(channelEntity);
                    });

                    return channelsEntity.getMyChannels();
                }).then(function(myChannelEntities) {
                    var joinPromises = [];

                    myChannelEntities.forEach(function(channelEntity) {
                        var channelSid = channelEntity.getId();
                        joinPromises.push(self._joinChannel(channelSid, channelsEntity));
                    });

                    return Promise.all(joinPromises).then(function() {
                        self._channels.forEach(function(channel) {
                            self.emit('channelAdded', channel);
                        });

                        return channelsEntity;
                    });
                });
        });

        Object.defineProperties(this, {
            _channels: { value: channels },
            _channelsPromise: { value: channelsPromise },
            _session: { value: session },
            token: {
                enumerable: true,
                get: function() { return token; }
            }
        });

        EventEmitter.call(this);
    }

    inherits(Client, EventEmitter);

    Client.prototype._addChannel = function _addChannel(channelEntity) {
        var channelSid = channelEntity.getId();
        var channel = this._channels.get(channelSid);

        if (channel) {
            channel._entity._update({
                name: channelEntity.getName(),
                attributes: JSON.stringify(channelEntity.getAttributes()),
                type: channelEntity.getType()
            });
        } else {
            channel = new Channel(channelEntity);
            this._channels.set(channelSid, channel);
        }

        return channel;
    };

    Client.prototype._joinChannel = function _joinChannel(channelSid, channels) {
        var self = this;

        function setJoined(channel) {
            self._channels.set(channelSid, channel);

            if (channel.status !== 'joined' && channel.status !== 'invited') {
                channel._entity._setState('joined');
            }

            return channel;
        }

        var channel = self._channels.get(channelSid);
        if (channel) { return Promise.resolve(channel).then(setJoined); }

        var channelsPromise = channels ? Promise.resolve(channels) : this._channelsPromise;

        return channelsPromise.then(function(channels) {
            return channels.getChannel(channelSid).then(Channel).then(setJoined);
        });
    };

    /**
     * Create a channel on the server.
     * @param {Client#CreateChannelOptions} [options] - Options for the Channel
     * @returns {Promise<Channel>}
     */
    Client.prototype.createChannel = function createChannel(options) {
        var self = this;
        options = options || { };

        return this._channelsPromise.then(function(channels) {
            var channel = channels.createChannel();
            channel.update({
                name: options.friendlyName,
                attributes: options.attributes,
                type: options.isPrivate ? 'private' : 'public'
            });

            return channels.add(channel);
        }).then(function(channelEntity) {
            return self._addChannel(channelEntity);
        });
    };

    /**
     * Get a Channel by its SID.
     * @param {String} channelSid - The channelSid to search for
     * @returns {Promise<Channel>}
     */
    Client.prototype.getChannel = function getChannel(channelSid) {
        var self = this;

        return this._channelsPromise.then(function(channels) {
            var channel = self._channels.get(channelSid);
            return channel || channels.getChannel(channelSid).then(self._addChannel.bind(self));
        });
    };

    /**
     * Get the current list of all Channels the Client knows about.
     * @returns {Promise<Array<Channel>>}
     */
    Client.prototype.getChannels = function getChannel() {
        var self = this;

        return this._channelsPromise.then(function() {
            var channels = [];

            self._channels.forEach(function(channel) {
                channels.push(channel);
            });

            return channels;
        });
    };

    /**
     * Update the token used by the Client and re-register with IP Messaging services.
     * @param {String} token - The JWT string of the new token.
     * @returns {Promise<Client>}
     */
    Client.prototype.updateToken = function updateToken(token) {
        if (!token || token.split('.').length !== 3) {
            throw new Error('A valid Twilio Capability Token must be passed to Client.updateToken');
        }

        return this._session.setAuthToken(token).then(function() {
            return this;
        }.bind(this));
    };

    Object.freeze(Client);

    /**
     * These options can be passed to Client.createChannel
     * @typedef {object} Client#CreateChannelOptions
     * @property {Object} [attributes] - The initial attributes of the Channel.
     * @property {Boolean} [isPrivate] - Whether or not this Channel is private.
     * @property {String} [friendlyName] - The initial friendlyName of the Channel.
     */

    /**
     * Fired when a Channel becomes visible to the Client.
     * @param {Channel} channel
     * @event Client#channelAdded
     */
    /**
     * Fired when a Channel is no longer visible to the Client.
     * @param {Channel} channel
     * @event Client#channelDeleted
     */
    /**
     * Fired when the Client is invited to a Channel.
     * @param {Channel} channel
     * @event Client#channelInvited
     */
    /**
     * Fired when the Client joins a Channel.
     * @param {Channel} channel
     * @event Client#channelJoined
     */
    /**
     * Fired when the Client leaves a Channel.
     * @param {Channel} channel
     * @event Client#channelLeft
     */

    module.exports = Client;

},{"./channel":1,"events":12,"twilio-ipmessaging-js-sdk":71,"util":47}],3:[function(require,module,exports){
    'use strict';

    function IPMessaging(accessToken) {
        return new IPMessaging.Client(accessToken);
    }

    Object.defineProperties(IPMessaging, {
        Client: {
            enumerable: true,
            value: require('./client')
        }
    });

    module.exports = IPMessaging;


},{"./client":2}],4:[function(require,module,exports){
    'use strict';

    /**
     * @class
     * @classdesc A Member represents a remote Client in a Channel.
     * @property {Channel} channel - The Channel the remote Client is a Member of.
     * @property {String} identity - The identity of the remote Client.
     * @property {String} sid - The server-assigned unique identifier for
     *   the Member.
     */
    function Member(channel, entity) {
        if (!(this instanceof Member)) {
            return new Member(channel, entity);
        }

        Object.defineProperties(this, {
            channel: {
                value: channel
            },
            identity: {
                enumerable: true,
                value: entity.getUsername()
            },
            sid: {
                enumerable: true,
                value: entity._getUid()
            }
        });
    }

    Object.freeze(Member);

    /**
     * Remove this Member from the Channel.
     * @returns Promise
     */
    Member.prototype.remove = function removeMember() {
        return this.channel.removeMember(this);
    };

    module.exports = Member;

},{}],5:[function(require,module,exports){
    'use strict';

    /**
     * @class
     * @classdesc A Message represents a Message in a Channel.
     * @property {String} author - The name of the user that authored this Message.
     * @property {String} body - The body of the Message.
     * @property {Date} timestamp - When the Message was sent (or updated).
     * @property {String} sid - The server-assigned unique identifier for
     *   the Message.
     */
    function Message(entity) {
        if (!(this instanceof Message)) {
            return new Message(entity);
        }

        Object.defineProperties(this, {
            author: {
                enumerable: true,
                value: entity.getAuthor()
            },
            body: {
                enumerable: true,
                value: entity.getBody()
            },
            timestamp: {
                enumerable: true,
                value: entity.getTimestamp()
            },
            sid: {
                enumerable: true,
                value: entity.getId()
            },
        });
    }

    Object.freeze(Message);

    module.exports = Message;

},{}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
    arguments[4][6][0].apply(exports,arguments)
},{"dup":6}],8:[function(require,module,exports){
    /*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
     * @license  MIT
     */

    var base64 = require('base64-js')
    var ieee754 = require('ieee754')
    var isArray = require('is-array')

    exports.Buffer = Buffer
    exports.SlowBuffer = SlowBuffer
    exports.INSPECT_MAX_BYTES = 50
    Buffer.poolSize = 8192 // not used by this implementation

    var rootParent = {}

    /**
     * If `Buffer.TYPED_ARRAY_SUPPORT`:
     *   === true    Use Uint8Array implementation (fastest)
     *   === false   Use Object implementation (most compatible, even IE6)
     *
     * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
     * Opera 11.6+, iOS 4.2+.
     *
     * Due to various browser bugs, sometimes the Object implementation will be used even
     * when the browser supports typed arrays.
     *
     * Note:
     *
     *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
     *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
     *
     *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
     *     on objects.
     *
     *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
     *
     *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
     *     incorrect length in some situations.

     * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
     * get the Object implementation, which is slower but behaves correctly.
     */
    Buffer.TYPED_ARRAY_SUPPORT = (function () {
        function Bar () {}
        try {
            var arr = new Uint8Array(1)
            arr.foo = function () { return 42 }
            arr.constructor = Bar
            return arr.foo() === 42 && // typed array instances can be augmented
                arr.constructor === Bar && // constructor can be set
                typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
                arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
        } catch (e) {
            return false
        }
    })()

    function kMaxLength () {
        return Buffer.TYPED_ARRAY_SUPPORT
            ? 0x7fffffff
            : 0x3fffffff
    }

    /**
     * Class: Buffer
     * =============
     *
     * The Buffer constructor returns instances of `Uint8Array` that are augmented
     * with function properties for all the node `Buffer` API functions. We use
     * `Uint8Array` so that square bracket notation works as expected -- it returns
     * a single octet.
     *
     * By augmenting the instances, we can avoid modifying the `Uint8Array`
     * prototype.
     */
    function Buffer (arg) {
        if (!(this instanceof Buffer)) {
            // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
            if (arguments.length > 1) return new Buffer(arg, arguments[1])
            return new Buffer(arg)
        }

        this.length = 0
        this.parent = undefined

        // Common case.
        if (typeof arg === 'number') {
            return fromNumber(this, arg)
        }

        // Slightly less common case.
        if (typeof arg === 'string') {
            return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
        }

        // Unusual.
        return fromObject(this, arg)
    }

    function fromNumber (that, length) {
        that = allocate(that, length < 0 ? 0 : checked(length) | 0)
        if (!Buffer.TYPED_ARRAY_SUPPORT) {
            for (var i = 0; i < length; i++) {
                that[i] = 0
            }
        }
        return that
    }

    function fromString (that, string, encoding) {
        if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

        // Assumption: byteLength() return value is always < kMaxLength.
        var length = byteLength(string, encoding) | 0
        that = allocate(that, length)

        that.write(string, encoding)
        return that
    }

    function fromObject (that, object) {
        if (Buffer.isBuffer(object)) return fromBuffer(that, object)

        if (isArray(object)) return fromArray(that, object)

        if (object == null) {
            throw new TypeError('must start with number, buffer, array or string')
        }

        if (typeof ArrayBuffer !== 'undefined') {
            if (object.buffer instanceof ArrayBuffer) {
                return fromTypedArray(that, object)
            }
            if (object instanceof ArrayBuffer) {
                return fromArrayBuffer(that, object)
            }
        }

        if (object.length) return fromArrayLike(that, object)

        return fromJsonObject(that, object)
    }

    function fromBuffer (that, buffer) {
        var length = checked(buffer.length) | 0
        that = allocate(that, length)
        buffer.copy(that, 0, 0, length)
        return that
    }

    function fromArray (that, array) {
        var length = checked(array.length) | 0
        that = allocate(that, length)
        for (var i = 0; i < length; i += 1) {
            that[i] = array[i] & 255
        }
        return that
    }

// Duplicate of fromArray() to keep fromArray() monomorphic.
    function fromTypedArray (that, array) {
        var length = checked(array.length) | 0
        that = allocate(that, length)
        // Truncating the elements is probably not what people expect from typed
        // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
        // of the old Buffer constructor.
        for (var i = 0; i < length; i += 1) {
            that[i] = array[i] & 255
        }
        return that
    }

    function fromArrayBuffer (that, array) {
        if (Buffer.TYPED_ARRAY_SUPPORT) {
            // Return an augmented `Uint8Array` instance, for best performance
            array.byteLength
            that = Buffer._augment(new Uint8Array(array))
        } else {
            // Fallback: Return an object instance of the Buffer class
            that = fromTypedArray(that, new Uint8Array(array))
        }
        return that
    }

    function fromArrayLike (that, array) {
        var length = checked(array.length) | 0
        that = allocate(that, length)
        for (var i = 0; i < length; i += 1) {
            that[i] = array[i] & 255
        }
        return that
    }

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
    function fromJsonObject (that, object) {
        var array
        var length = 0

        if (object.type === 'Buffer' && isArray(object.data)) {
            array = object.data
            length = checked(array.length) | 0
        }
        that = allocate(that, length)

        for (var i = 0; i < length; i += 1) {
            that[i] = array[i] & 255
        }
        return that
    }

    function allocate (that, length) {
        if (Buffer.TYPED_ARRAY_SUPPORT) {
            // Return an augmented `Uint8Array` instance, for best performance
            that = Buffer._augment(new Uint8Array(length))
        } else {
            // Fallback: Return an object instance of the Buffer class
            that.length = length
            that._isBuffer = true
        }

        var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
        if (fromPool) that.parent = rootParent

        return that
    }

    function checked (length) {
        // Note: cannot use `length < kMaxLength` here because that fails when
        // length is NaN (which is otherwise coerced to zero.)
        if (length >= kMaxLength()) {
            throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                'size: 0x' + kMaxLength().toString(16) + ' bytes')
        }
        return length | 0
    }

    function SlowBuffer (subject, encoding) {
        if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

        var buf = new Buffer(subject, encoding)
        delete buf.parent
        return buf
    }

    Buffer.isBuffer = function isBuffer (b) {
        return !!(b != null && b._isBuffer)
    }

    Buffer.compare = function compare (a, b) {
        if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
            throw new TypeError('Arguments must be Buffers')
        }

        if (a === b) return 0

        var x = a.length
        var y = b.length

        var i = 0
        var len = Math.min(x, y)
        while (i < len) {
            if (a[i] !== b[i]) break

            ++i
        }

        if (i !== len) {
            x = a[i]
            y = b[i]
        }

        if (x < y) return -1
        if (y < x) return 1
        return 0
    }

    Buffer.isEncoding = function isEncoding (encoding) {
        switch (String(encoding).toLowerCase()) {
            case 'hex':
            case 'utf8':
            case 'utf-8':
            case 'ascii':
            case 'binary':
            case 'base64':
            case 'raw':
            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
                return true
            default:
                return false
        }
    }

    Buffer.concat = function concat (list, length) {
        if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

        if (list.length === 0) {
            return new Buffer(0)
        }

        var i
        if (length === undefined) {
            length = 0
            for (i = 0; i < list.length; i++) {
                length += list[i].length
            }
        }

        var buf = new Buffer(length)
        var pos = 0
        for (i = 0; i < list.length; i++) {
            var item = list[i]
            item.copy(buf, pos)
            pos += item.length
        }
        return buf
    }

    function byteLength (string, encoding) {
        if (typeof string !== 'string') string = '' + string

        var len = string.length
        if (len === 0) return 0

        // Use a for loop to avoid recursion
        var loweredCase = false
        for (;;) {
            switch (encoding) {
                case 'ascii':
                case 'binary':
                // Deprecated
                case 'raw':
                case 'raws':
                    return len
                case 'utf8':
                case 'utf-8':
                    return utf8ToBytes(string).length
                case 'ucs2':
                case 'ucs-2':
                case 'utf16le':
                case 'utf-16le':
                    return len * 2
                case 'hex':
                    return len >>> 1
                case 'base64':
                    return base64ToBytes(string).length
                default:
                    if (loweredCase) return utf8ToBytes(string).length // assume utf8
                    encoding = ('' + encoding).toLowerCase()
                    loweredCase = true
            }
        }
    }
    Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
    Buffer.prototype.length = undefined
    Buffer.prototype.parent = undefined

    function slowToString (encoding, start, end) {
        var loweredCase = false

        start = start | 0
        end = end === undefined || end === Infinity ? this.length : end | 0

        if (!encoding) encoding = 'utf8'
        if (start < 0) start = 0
        if (end > this.length) end = this.length
        if (end <= start) return ''

        while (true) {
            switch (encoding) {
                case 'hex':
                    return hexSlice(this, start, end)

                case 'utf8':
                case 'utf-8':
                    return utf8Slice(this, start, end)

                case 'ascii':
                    return asciiSlice(this, start, end)

                case 'binary':
                    return binarySlice(this, start, end)

                case 'base64':
                    return base64Slice(this, start, end)

                case 'ucs2':
                case 'ucs-2':
                case 'utf16le':
                case 'utf-16le':
                    return utf16leSlice(this, start, end)

                default:
                    if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
                    encoding = (encoding + '').toLowerCase()
                    loweredCase = true
            }
        }
    }

    Buffer.prototype.toString = function toString () {
        var length = this.length | 0
        if (length === 0) return ''
        if (arguments.length === 0) return utf8Slice(this, 0, length)
        return slowToString.apply(this, arguments)
    }

    Buffer.prototype.equals = function equals (b) {
        if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
        if (this === b) return true
        return Buffer.compare(this, b) === 0
    }

    Buffer.prototype.inspect = function inspect () {
        var str = ''
        var max = exports.INSPECT_MAX_BYTES
        if (this.length > 0) {
            str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
            if (this.length > max) str += ' ... '
        }
        return '<Buffer ' + str + '>'
    }

    Buffer.prototype.compare = function compare (b) {
        if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
        if (this === b) return 0
        return Buffer.compare(this, b)
    }

    Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
        if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
        else if (byteOffset < -0x80000000) byteOffset = -0x80000000
        byteOffset >>= 0

        if (this.length === 0) return -1
        if (byteOffset >= this.length) return -1

        // Negative offsets start from the end of the buffer
        if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

        if (typeof val === 'string') {
            if (val.length === 0) return -1 // special case: looking for empty string always fails
            return String.prototype.indexOf.call(this, val, byteOffset)
        }
        if (Buffer.isBuffer(val)) {
            return arrayIndexOf(this, val, byteOffset)
        }
        if (typeof val === 'number') {
            if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
                return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
            }
            return arrayIndexOf(this, [ val ], byteOffset)
        }

        function arrayIndexOf (arr, val, byteOffset) {
            var foundIndex = -1
            for (var i = 0; byteOffset + i < arr.length; i++) {
                if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
                    if (foundIndex === -1) foundIndex = i
                    if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
                } else {
                    foundIndex = -1
                }
            }
            return -1
        }

        throw new TypeError('val must be string, number or Buffer')
    }

// `get` is deprecated
    Buffer.prototype.get = function get (offset) {
        console.log('.get() is deprecated. Access using array indexes instead.')
        return this.readUInt8(offset)
    }

// `set` is deprecated
    Buffer.prototype.set = function set (v, offset) {
        console.log('.set() is deprecated. Access using array indexes instead.')
        return this.writeUInt8(v, offset)
    }

    function hexWrite (buf, string, offset, length) {
        offset = Number(offset) || 0
        var remaining = buf.length - offset
        if (!length) {
            length = remaining
        } else {
            length = Number(length)
            if (length > remaining) {
                length = remaining
            }
        }

        // must be an even number of digits
        var strLen = string.length
        if (strLen % 2 !== 0) throw new Error('Invalid hex string')

        if (length > strLen / 2) {
            length = strLen / 2
        }
        for (var i = 0; i < length; i++) {
            var parsed = parseInt(string.substr(i * 2, 2), 16)
            if (isNaN(parsed)) throw new Error('Invalid hex string')
            buf[offset + i] = parsed
        }
        return i
    }

    function utf8Write (buf, string, offset, length) {
        return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
    }

    function asciiWrite (buf, string, offset, length) {
        return blitBuffer(asciiToBytes(string), buf, offset, length)
    }

    function binaryWrite (buf, string, offset, length) {
        return asciiWrite(buf, string, offset, length)
    }

    function base64Write (buf, string, offset, length) {
        return blitBuffer(base64ToBytes(string), buf, offset, length)
    }

    function ucs2Write (buf, string, offset, length) {
        return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
    }

    Buffer.prototype.write = function write (string, offset, length, encoding) {
        // Buffer#write(string)
        if (offset === undefined) {
            encoding = 'utf8'
            length = this.length
            offset = 0
            // Buffer#write(string, encoding)
        } else if (length === undefined && typeof offset === 'string') {
            encoding = offset
            length = this.length
            offset = 0
            // Buffer#write(string, offset[, length][, encoding])
        } else if (isFinite(offset)) {
            offset = offset | 0
            if (isFinite(length)) {
                length = length | 0
                if (encoding === undefined) encoding = 'utf8'
            } else {
                encoding = length
                length = undefined
            }
            // legacy write(string, encoding, offset, length) - remove in v0.13
        } else {
            var swap = encoding
            encoding = offset
            offset = length | 0
            length = swap
        }

        var remaining = this.length - offset
        if (length === undefined || length > remaining) length = remaining

        if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
            throw new RangeError('attempt to write outside buffer bounds')
        }

        if (!encoding) encoding = 'utf8'

        var loweredCase = false
        for (;;) {
            switch (encoding) {
                case 'hex':
                    return hexWrite(this, string, offset, length)

                case 'utf8':
                case 'utf-8':
                    return utf8Write(this, string, offset, length)

                case 'ascii':
                    return asciiWrite(this, string, offset, length)

                case 'binary':
                    return binaryWrite(this, string, offset, length)

                case 'base64':
                    // Warning: maxLength not taken into account in base64Write
                    return base64Write(this, string, offset, length)

                case 'ucs2':
                case 'ucs-2':
                case 'utf16le':
                case 'utf-16le':
                    return ucs2Write(this, string, offset, length)

                default:
                    if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
                    encoding = ('' + encoding).toLowerCase()
                    loweredCase = true
            }
        }
    }

    Buffer.prototype.toJSON = function toJSON () {
        return {
            type: 'Buffer',
            data: Array.prototype.slice.call(this._arr || this, 0)
        }
    }

    function base64Slice (buf, start, end) {
        if (start === 0 && end === buf.length) {
            return base64.fromByteArray(buf)
        } else {
            return base64.fromByteArray(buf.slice(start, end))
        }
    }

    function utf8Slice (buf, start, end) {
        end = Math.min(buf.length, end)
        var firstByte
        var secondByte
        var thirdByte
        var fourthByte
        var bytesPerSequence
        var tempCodePoint
        var codePoint
        var res = []
        var i = start

        for (; i < end; i += bytesPerSequence) {
            firstByte = buf[i]
            codePoint = 0xFFFD

            if (firstByte > 0xEF) {
                bytesPerSequence = 4
            } else if (firstByte > 0xDF) {
                bytesPerSequence = 3
            } else if (firstByte > 0xBF) {
                bytesPerSequence = 2
            } else {
                bytesPerSequence = 1
            }

            if (i + bytesPerSequence <= end) {
                switch (bytesPerSequence) {
                    case 1:
                        if (firstByte < 0x80) {
                            codePoint = firstByte
                        }
                        break
                    case 2:
                        secondByte = buf[i + 1]
                        if ((secondByte & 0xC0) === 0x80) {
                            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
                            if (tempCodePoint > 0x7F) {
                                codePoint = tempCodePoint
                            }
                        }
                        break
                    case 3:
                        secondByte = buf[i + 1]
                        thirdByte = buf[i + 2]
                        if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
                            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                                codePoint = tempCodePoint
                            }
                        }
                        break
                    case 4:
                        secondByte = buf[i + 1]
                        thirdByte = buf[i + 2]
                        fourthByte = buf[i + 3]
                        if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
                            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                                codePoint = tempCodePoint
                            }
                        }
                }
            }

            if (codePoint === 0xFFFD) {
                // we generated an invalid codePoint so make sure to only advance by 1 byte
                bytesPerSequence = 1
            } else if (codePoint > 0xFFFF) {
                // encode to utf16 (surrogate pair dance)
                codePoint -= 0x10000
                res.push(codePoint >>> 10 & 0x3FF | 0xD800)
                codePoint = 0xDC00 | codePoint & 0x3FF
            }

            res.push(codePoint)
        }

        return String.fromCharCode.apply(String, res)
    }

    function asciiSlice (buf, start, end) {
        var ret = ''
        end = Math.min(buf.length, end)

        for (var i = start; i < end; i++) {
            ret += String.fromCharCode(buf[i] & 0x7F)
        }
        return ret
    }

    function binarySlice (buf, start, end) {
        var ret = ''
        end = Math.min(buf.length, end)

        for (var i = start; i < end; i++) {
            ret += String.fromCharCode(buf[i])
        }
        return ret
    }

    function hexSlice (buf, start, end) {
        var len = buf.length

        if (!start || start < 0) start = 0
        if (!end || end < 0 || end > len) end = len

        var out = ''
        for (var i = start; i < end; i++) {
            out += toHex(buf[i])
        }
        return out
    }

    function utf16leSlice (buf, start, end) {
        var bytes = buf.slice(start, end)
        var res = ''
        for (var i = 0; i < bytes.length; i += 2) {
            res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
        }
        return res
    }

    Buffer.prototype.slice = function slice (start, end) {
        var len = this.length
        start = ~~start
        end = end === undefined ? len : ~~end

        if (start < 0) {
            start += len
            if (start < 0) start = 0
        } else if (start > len) {
            start = len
        }

        if (end < 0) {
            end += len
            if (end < 0) end = 0
        } else if (end > len) {
            end = len
        }

        if (end < start) end = start

        var newBuf
        if (Buffer.TYPED_ARRAY_SUPPORT) {
            newBuf = Buffer._augment(this.subarray(start, end))
        } else {
            var sliceLen = end - start
            newBuf = new Buffer(sliceLen, undefined)
            for (var i = 0; i < sliceLen; i++) {
                newBuf[i] = this[i + start]
            }
        }

        if (newBuf.length) newBuf.parent = this.parent || this

        return newBuf
    }

    /*
     * Need to make sure that buffer isn't trying to write out of bounds.
     */
    function checkOffset (offset, ext, length) {
        if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
        if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
    }

    Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
        offset = offset | 0
        byteLength = byteLength | 0
        if (!noAssert) checkOffset(offset, byteLength, this.length)

        var val = this[offset]
        var mul = 1
        var i = 0
        while (++i < byteLength && (mul *= 0x100)) {
            val += this[offset + i] * mul
        }

        return val
    }

    Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
        offset = offset | 0
        byteLength = byteLength | 0
        if (!noAssert) {
            checkOffset(offset, byteLength, this.length)
        }

        var val = this[offset + --byteLength]
        var mul = 1
        while (byteLength > 0 && (mul *= 0x100)) {
            val += this[offset + --byteLength] * mul
        }

        return val
    }

    Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 1, this.length)
        return this[offset]
    }

    Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 2, this.length)
        return this[offset] | (this[offset + 1] << 8)
    }

    Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 2, this.length)
        return (this[offset] << 8) | this[offset + 1]
    }

    Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 4, this.length)

        return ((this[offset]) |
            (this[offset + 1] << 8) |
            (this[offset + 2] << 16)) +
            (this[offset + 3] * 0x1000000)
    }

    Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 4, this.length)

        return (this[offset] * 0x1000000) +
            ((this[offset + 1] << 16) |
            (this[offset + 2] << 8) |
            this[offset + 3])
    }

    Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
        offset = offset | 0
        byteLength = byteLength | 0
        if (!noAssert) checkOffset(offset, byteLength, this.length)

        var val = this[offset]
        var mul = 1
        var i = 0
        while (++i < byteLength && (mul *= 0x100)) {
            val += this[offset + i] * mul
        }
        mul *= 0x80

        if (val >= mul) val -= Math.pow(2, 8 * byteLength)

        return val
    }

    Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
        offset = offset | 0
        byteLength = byteLength | 0
        if (!noAssert) checkOffset(offset, byteLength, this.length)

        var i = byteLength
        var mul = 1
        var val = this[offset + --i]
        while (i > 0 && (mul *= 0x100)) {
            val += this[offset + --i] * mul
        }
        mul *= 0x80

        if (val >= mul) val -= Math.pow(2, 8 * byteLength)

        return val
    }

    Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 1, this.length)
        if (!(this[offset] & 0x80)) return (this[offset])
        return ((0xff - this[offset] + 1) * -1)
    }

    Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 2, this.length)
        var val = this[offset] | (this[offset + 1] << 8)
        return (val & 0x8000) ? val | 0xFFFF0000 : val
    }

    Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 2, this.length)
        var val = this[offset + 1] | (this[offset] << 8)
        return (val & 0x8000) ? val | 0xFFFF0000 : val
    }

    Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 4, this.length)

        return (this[offset]) |
            (this[offset + 1] << 8) |
            (this[offset + 2] << 16) |
            (this[offset + 3] << 24)
    }

    Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 4, this.length)

        return (this[offset] << 24) |
            (this[offset + 1] << 16) |
            (this[offset + 2] << 8) |
            (this[offset + 3])
    }

    Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 4, this.length)
        return ieee754.read(this, offset, true, 23, 4)
    }

    Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 4, this.length)
        return ieee754.read(this, offset, false, 23, 4)
    }

    Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 8, this.length)
        return ieee754.read(this, offset, true, 52, 8)
    }

    Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
        if (!noAssert) checkOffset(offset, 8, this.length)
        return ieee754.read(this, offset, false, 52, 8)
    }

    function checkInt (buf, value, offset, ext, max, min) {
        if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
        if (value > max || value < min) throw new RangeError('value is out of bounds')
        if (offset + ext > buf.length) throw new RangeError('index out of range')
    }

    Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
        value = +value
        offset = offset | 0
        byteLength = byteLength | 0
        if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

        var mul = 1
        var i = 0
        this[offset] = value & 0xFF
        while (++i < byteLength && (mul *= 0x100)) {
            this[offset + i] = (value / mul) & 0xFF
        }

        return offset + byteLength
    }

    Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
        value = +value
        offset = offset | 0
        byteLength = byteLength | 0
        if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

        var i = byteLength - 1
        var mul = 1
        this[offset + i] = value & 0xFF
        while (--i >= 0 && (mul *= 0x100)) {
            this[offset + i] = (value / mul) & 0xFF
        }

        return offset + byteLength
    }

    Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
        value = +value
        offset = offset | 0
        if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
        if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
        this[offset] = value
        return offset + 1
    }

    function objectWriteUInt16 (buf, value, offset, littleEndian) {
        if (value < 0) value = 0xffff + value + 1
        for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
            buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
                (littleEndian ? i : 1 - i) * 8
        }
    }

    Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
        value = +value
        offset = offset | 0
        if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
        if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = value
            this[offset + 1] = (value >>> 8)
        } else {
            objectWriteUInt16(this, value, offset, true)
        }
        return offset + 2
    }

    Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
        value = +value
        offset = offset | 0
        if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
        if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = (value >>> 8)
            this[offset + 1] = value
        } else {
            objectWriteUInt16(this, value, offset, false)
        }
        return offset + 2
    }

    function objectWriteUInt32 (buf, value, offset, littleEndian) {
        if (value < 0) value = 0xffffffff + value + 1
        for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
            buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
        }
    }

    Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
        value = +value
        offset = offset | 0
        if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
        if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset + 3] = (value >>> 24)
            this[offset + 2] = (value >>> 16)
            this[offset + 1] = (value >>> 8)
            this[offset] = value
        } else {
            objectWriteUInt32(this, value, offset, true)
        }
        return offset + 4
    }

    Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
        value = +value
        offset = offset | 0
        if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
        if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = (value >>> 24)
            this[offset + 1] = (value >>> 16)
            this[offset + 2] = (value >>> 8)
            this[offset + 3] = value
        } else {
            objectWriteUInt32(this, value, offset, false)
        }
        return offset + 4
    }

    Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
        value = +value
        offset = offset | 0
        if (!noAssert) {
            var limit = Math.pow(2, 8 * byteLength - 1)

            checkInt(this, value, offset, byteLength, limit - 1, -limit)
        }

        var i = 0
        var mul = 1
        var sub = value < 0 ? 1 : 0
        this[offset] = value & 0xFF
        while (++i < byteLength && (mul *= 0x100)) {
            this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
        }

        return offset + byteLength
    }

    Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
        value = +value
        offset = offset | 0
        if (!noAssert) {
            var limit = Math.pow(2, 8 * byteLength - 1)

            checkInt(this, value, offset, byteLength, limit - 1, -limit)
        }

        var i = byteLength - 1
        var mul = 1
        var sub = value < 0 ? 1 : 0
        this[offset + i] = value & 0xFF
        while (--i >= 0 && (mul *= 0x100)) {
            this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
        }

        return offset + byteLength
    }

    Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
        value = +value
        offset = offset | 0
        if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
        if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
        if (value < 0) value = 0xff + value + 1
        this[offset] = value
        return offset + 1
    }

    Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
        value = +value
        offset = offset | 0
        if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
        if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = value
            this[offset + 1] = (value >>> 8)
        } else {
            objectWriteUInt16(this, value, offset, true)
        }
        return offset + 2
    }

    Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
        value = +value
        offset = offset | 0
        if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
        if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = (value >>> 8)
            this[offset + 1] = value
        } else {
            objectWriteUInt16(this, value, offset, false)
        }
        return offset + 2
    }

    Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
        value = +value
        offset = offset | 0
        if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
        if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = value
            this[offset + 1] = (value >>> 8)
            this[offset + 2] = (value >>> 16)
            this[offset + 3] = (value >>> 24)
        } else {
            objectWriteUInt32(this, value, offset, true)
        }
        return offset + 4
    }

    Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
        value = +value
        offset = offset | 0
        if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
        if (value < 0) value = 0xffffffff + value + 1
        if (Buffer.TYPED_ARRAY_SUPPORT) {
            this[offset] = (value >>> 24)
            this[offset + 1] = (value >>> 16)
            this[offset + 2] = (value >>> 8)
            this[offset + 3] = value
        } else {
            objectWriteUInt32(this, value, offset, false)
        }
        return offset + 4
    }

    function checkIEEE754 (buf, value, offset, ext, max, min) {
        if (value > max || value < min) throw new RangeError('value is out of bounds')
        if (offset + ext > buf.length) throw new RangeError('index out of range')
        if (offset < 0) throw new RangeError('index out of range')
    }

    function writeFloat (buf, value, offset, littleEndian, noAssert) {
        if (!noAssert) {
            checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
        }
        ieee754.write(buf, value, offset, littleEndian, 23, 4)
        return offset + 4
    }

    Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
        return writeFloat(this, value, offset, true, noAssert)
    }

    Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
        return writeFloat(this, value, offset, false, noAssert)
    }

    function writeDouble (buf, value, offset, littleEndian, noAssert) {
        if (!noAssert) {
            checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
        }
        ieee754.write(buf, value, offset, littleEndian, 52, 8)
        return offset + 8
    }

    Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
        return writeDouble(this, value, offset, true, noAssert)
    }

    Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
        return writeDouble(this, value, offset, false, noAssert)
    }

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
    Buffer.prototype.copy = function copy (target, targetStart, start, end) {
        if (!start) start = 0
        if (!end && end !== 0) end = this.length
        if (targetStart >= target.length) targetStart = target.length
        if (!targetStart) targetStart = 0
        if (end > 0 && end < start) end = start

        // Copy 0 bytes; we're done
        if (end === start) return 0
        if (target.length === 0 || this.length === 0) return 0

        // Fatal error conditions
        if (targetStart < 0) {
            throw new RangeError('targetStart out of bounds')
        }
        if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
        if (end < 0) throw new RangeError('sourceEnd out of bounds')

        // Are we oob?
        if (end > this.length) end = this.length
        if (target.length - targetStart < end - start) {
            end = target.length - targetStart + start
        }

        var len = end - start
        var i

        if (this === target && start < targetStart && targetStart < end) {
            // descending copy from end
            for (i = len - 1; i >= 0; i--) {
                target[i + targetStart] = this[i + start]
            }
        } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
            // ascending copy from start
            for (i = 0; i < len; i++) {
                target[i + targetStart] = this[i + start]
            }
        } else {
            target._set(this.subarray(start, start + len), targetStart)
        }

        return len
    }

// fill(value, start=0, end=buffer.length)
    Buffer.prototype.fill = function fill (value, start, end) {
        if (!value) value = 0
        if (!start) start = 0
        if (!end) end = this.length

        if (end < start) throw new RangeError('end < start')

        // Fill 0 bytes; we're done
        if (end === start) return
        if (this.length === 0) return

        if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
        if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

        var i
        if (typeof value === 'number') {
            for (i = start; i < end; i++) {
                this[i] = value
            }
        } else {
            var bytes = utf8ToBytes(value.toString())
            var len = bytes.length
            for (i = start; i < end; i++) {
                this[i] = bytes[i % len]
            }
        }

        return this
    }

    /**
     * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
     * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
     */
    Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
        if (typeof Uint8Array !== 'undefined') {
            if (Buffer.TYPED_ARRAY_SUPPORT) {
                return (new Buffer(this)).buffer
            } else {
                var buf = new Uint8Array(this.length)
                for (var i = 0, len = buf.length; i < len; i += 1) {
                    buf[i] = this[i]
                }
                return buf.buffer
            }
        } else {
            throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
        }
    }

// HELPER FUNCTIONS
// ================

    var BP = Buffer.prototype

    /**
     * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
     */
    Buffer._augment = function _augment (arr) {
        arr.constructor = Buffer
        arr._isBuffer = true

        // save reference to original Uint8Array set method before overwriting
        arr._set = arr.set

        // deprecated
        arr.get = BP.get
        arr.set = BP.set

        arr.write = BP.write
        arr.toString = BP.toString
        arr.toLocaleString = BP.toString
        arr.toJSON = BP.toJSON
        arr.equals = BP.equals
        arr.compare = BP.compare
        arr.indexOf = BP.indexOf
        arr.copy = BP.copy
        arr.slice = BP.slice
        arr.readUIntLE = BP.readUIntLE
        arr.readUIntBE = BP.readUIntBE
        arr.readUInt8 = BP.readUInt8
        arr.readUInt16LE = BP.readUInt16LE
        arr.readUInt16BE = BP.readUInt16BE
        arr.readUInt32LE = BP.readUInt32LE
        arr.readUInt32BE = BP.readUInt32BE
        arr.readIntLE = BP.readIntLE
        arr.readIntBE = BP.readIntBE
        arr.readInt8 = BP.readInt8
        arr.readInt16LE = BP.readInt16LE
        arr.readInt16BE = BP.readInt16BE
        arr.readInt32LE = BP.readInt32LE
        arr.readInt32BE = BP.readInt32BE
        arr.readFloatLE = BP.readFloatLE
        arr.readFloatBE = BP.readFloatBE
        arr.readDoubleLE = BP.readDoubleLE
        arr.readDoubleBE = BP.readDoubleBE
        arr.writeUInt8 = BP.writeUInt8
        arr.writeUIntLE = BP.writeUIntLE
        arr.writeUIntBE = BP.writeUIntBE
        arr.writeUInt16LE = BP.writeUInt16LE
        arr.writeUInt16BE = BP.writeUInt16BE
        arr.writeUInt32LE = BP.writeUInt32LE
        arr.writeUInt32BE = BP.writeUInt32BE
        arr.writeIntLE = BP.writeIntLE
        arr.writeIntBE = BP.writeIntBE
        arr.writeInt8 = BP.writeInt8
        arr.writeInt16LE = BP.writeInt16LE
        arr.writeInt16BE = BP.writeInt16BE
        arr.writeInt32LE = BP.writeInt32LE
        arr.writeInt32BE = BP.writeInt32BE
        arr.writeFloatLE = BP.writeFloatLE
        arr.writeFloatBE = BP.writeFloatBE
        arr.writeDoubleLE = BP.writeDoubleLE
        arr.writeDoubleBE = BP.writeDoubleBE
        arr.fill = BP.fill
        arr.inspect = BP.inspect
        arr.toArrayBuffer = BP.toArrayBuffer

        return arr
    }

    var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

    function base64clean (str) {
        // Node strips out invalid characters like \n and \t from the string, base64-js does not
        str = stringtrim(str).replace(INVALID_BASE64_RE, '')
        // Node converts strings with length < 2 to ''
        if (str.length < 2) return ''
        // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
        while (str.length % 4 !== 0) {
            str = str + '='
        }
        return str
    }

    function stringtrim (str) {
        if (str.trim) return str.trim()
        return str.replace(/^\s+|\s+$/g, '')
    }

    function toHex (n) {
        if (n < 16) return '0' + n.toString(16)
        return n.toString(16)
    }

    function utf8ToBytes (string, units) {
        units = units || Infinity
        var codePoint
        var length = string.length
        var leadSurrogate = null
        var bytes = []

        for (var i = 0; i < length; i++) {
            codePoint = string.charCodeAt(i)

            // is surrogate component
            if (codePoint > 0xD7FF && codePoint < 0xE000) {
                // last char was a lead
                if (!leadSurrogate) {
                    // no lead yet
                    if (codePoint > 0xDBFF) {
                        // unexpected trail
                        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
                        continue

                    } else if (i + 1 === length) {
                        // unpaired lead
                        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
                        continue
                    }

                    // valid lead
                    leadSurrogate = codePoint

                    continue
                }

                // 2 leads in a row
                if (codePoint < 0xDC00) {
                    if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
                    leadSurrogate = codePoint
                    continue
                }

                // valid surrogate pair
                codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000

            } else if (leadSurrogate) {
                // valid bmp char, but last char was a lead
                if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
            }

            leadSurrogate = null

            // encode utf8
            if (codePoint < 0x80) {
                if ((units -= 1) < 0) break
                bytes.push(codePoint)
            } else if (codePoint < 0x800) {
                if ((units -= 2) < 0) break
                bytes.push(
                    codePoint >> 0x6 | 0xC0,
                    codePoint & 0x3F | 0x80
                )
            } else if (codePoint < 0x10000) {
                if ((units -= 3) < 0) break
                bytes.push(
                    codePoint >> 0xC | 0xE0,
                    codePoint >> 0x6 & 0x3F | 0x80,
                    codePoint & 0x3F | 0x80
                )
            } else if (codePoint < 0x110000) {
                if ((units -= 4) < 0) break
                bytes.push(
                    codePoint >> 0x12 | 0xF0,
                    codePoint >> 0xC & 0x3F | 0x80,
                    codePoint >> 0x6 & 0x3F | 0x80,
                    codePoint & 0x3F | 0x80
                )
            } else {
                throw new Error('Invalid code point')
            }
        }

        return bytes
    }

    function asciiToBytes (str) {
        var byteArray = []
        for (var i = 0; i < str.length; i++) {
            // Node's code seems to be doing this and not & 0x7F..
            byteArray.push(str.charCodeAt(i) & 0xFF)
        }
        return byteArray
    }

    function utf16leToBytes (str, units) {
        var c, hi, lo
        var byteArray = []
        for (var i = 0; i < str.length; i++) {
            if ((units -= 2) < 0) break

            c = str.charCodeAt(i)
            hi = c >> 8
            lo = c % 256
            byteArray.push(lo)
            byteArray.push(hi)
        }

        return byteArray
    }

    function base64ToBytes (str) {
        return base64.toByteArray(base64clean(str))
    }

    function blitBuffer (src, dst, offset, length) {
        for (var i = 0; i < length; i++) {
            if ((i + offset >= dst.length) || (i >= src.length)) break
            dst[i + offset] = src[i]
        }
        return i
    }

},{"base64-js":9,"ieee754":10,"is-array":11}],9:[function(require,module,exports){
    var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    ;(function (exports) {
        'use strict';

        var Arr = (typeof Uint8Array !== 'undefined')
            ? Uint8Array
            : Array

        var PLUS   = '+'.charCodeAt(0)
        var SLASH  = '/'.charCodeAt(0)
        var NUMBER = '0'.charCodeAt(0)
        var LOWER  = 'a'.charCodeAt(0)
        var UPPER  = 'A'.charCodeAt(0)
        var PLUS_URL_SAFE = '-'.charCodeAt(0)
        var SLASH_URL_SAFE = '_'.charCodeAt(0)

        function decode (elt) {
            var code = elt.charCodeAt(0)
            if (code === PLUS ||
                code === PLUS_URL_SAFE)
                return 62 // '+'
            if (code === SLASH ||
                code === SLASH_URL_SAFE)
                return 63 // '/'
            if (code < NUMBER)
                return -1 //no match
            if (code < NUMBER + 10)
                return code - NUMBER + 26 + 26
            if (code < UPPER + 26)
                return code - UPPER
            if (code < LOWER + 26)
                return code - LOWER + 26
        }

        function b64ToByteArray (b64) {
            var i, j, l, tmp, placeHolders, arr

            if (b64.length % 4 > 0) {
                throw new Error('Invalid string. Length must be a multiple of 4')
            }

            // the number of equal signs (place holders)
            // if there are two placeholders, than the two characters before it
            // represent one byte
            // if there is only one, then the three characters before it represent 2 bytes
            // this is just a cheap hack to not do indexOf twice
            var len = b64.length
            placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

            // base64 is 4/3 + up to two characters of the original data
            arr = new Arr(b64.length * 3 / 4 - placeHolders)

            // if there are placeholders, only get up to the last complete 4 chars
            l = placeHolders > 0 ? b64.length - 4 : b64.length

            var L = 0

            function push (v) {
                arr[L++] = v
            }

            for (i = 0, j = 0; i < l; i += 4, j += 3) {
                tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
                push((tmp & 0xFF0000) >> 16)
                push((tmp & 0xFF00) >> 8)
                push(tmp & 0xFF)
            }

            if (placeHolders === 2) {
                tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
                push(tmp & 0xFF)
            } else if (placeHolders === 1) {
                tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
                push((tmp >> 8) & 0xFF)
                push(tmp & 0xFF)
            }

            return arr
        }

        function uint8ToBase64 (uint8) {
            var i,
                extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
                output = "",
                temp, length

            function encode (num) {
                return lookup.charAt(num)
            }

            function tripletToBase64 (num) {
                return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
            }

            // go through the array every three bytes, we'll deal with trailing stuff later
            for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
                temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
                output += tripletToBase64(temp)
            }

            // pad the end with zeros, but make sure to not forget the extra bytes
            switch (extraBytes) {
                case 1:
                    temp = uint8[uint8.length - 1]
                    output += encode(temp >> 2)
                    output += encode((temp << 4) & 0x3F)
                    output += '=='
                    break
                case 2:
                    temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
                    output += encode(temp >> 10)
                    output += encode((temp >> 4) & 0x3F)
                    output += encode((temp << 2) & 0x3F)
                    output += '='
                    break
            }

            return output
        }

        exports.toByteArray = b64ToByteArray
        exports.fromByteArray = uint8ToBase64
    }(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],10:[function(require,module,exports){
    exports.read = function (buffer, offset, isLE, mLen, nBytes) {
        var e, m
        var eLen = nBytes * 8 - mLen - 1
        var eMax = (1 << eLen) - 1
        var eBias = eMax >> 1
        var nBits = -7
        var i = isLE ? (nBytes - 1) : 0
        var d = isLE ? -1 : 1
        var s = buffer[offset + i]

        i += d

        e = s & ((1 << (-nBits)) - 1)
        s >>= (-nBits)
        nBits += eLen
        for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

        m = e & ((1 << (-nBits)) - 1)
        e >>= (-nBits)
        nBits += mLen
        for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

        if (e === 0) {
            e = 1 - eBias
        } else if (e === eMax) {
            return m ? NaN : ((s ? -1 : 1) * Infinity)
        } else {
            m = m + Math.pow(2, mLen)
            e = e - eBias
        }
        return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
    }

    exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
        var e, m, c
        var eLen = nBytes * 8 - mLen - 1
        var eMax = (1 << eLen) - 1
        var eBias = eMax >> 1
        var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
        var i = isLE ? 0 : (nBytes - 1)
        var d = isLE ? 1 : -1
        var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

        value = Math.abs(value)

        if (isNaN(value) || value === Infinity) {
            m = isNaN(value) ? 1 : 0
            e = eMax
        } else {
            e = Math.floor(Math.log(value) / Math.LN2)
            if (value * (c = Math.pow(2, -e)) < 1) {
                e--
                c *= 2
            }
            if (e + eBias >= 1) {
                value += rt / c
            } else {
                value += rt * Math.pow(2, 1 - eBias)
            }
            if (value * c >= 2) {
                e++
                c /= 2
            }

            if (e + eBias >= eMax) {
                m = 0
                e = eMax
            } else if (e + eBias >= 1) {
                m = (value * c - 1) * Math.pow(2, mLen)
                e = e + eBias
            } else {
                m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
                e = 0
            }
        }

        for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

        e = (e << mLen) | m
        eLen += mLen
        for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

        buffer[offset + i - d] |= s * 128
    }

},{}],11:[function(require,module,exports){

    /**
     * isArray
     */

    var isArray = Array.isArray;

    /**
     * toString
     */

    var str = Object.prototype.toString;

    /**
     * Whether or not the given `val`
     * is an array.
     *
     * example:
     *
     *        isArray([]);
     *        // > true
     *        isArray(arguments);
     *        // > false
     *        isArray('');
     *        // > false
     *
     * @param {mixed} val
     * @return {bool}
     */

    module.exports = isArray || function (val) {
            return !! val && '[object Array]' == str.call(val);
        };

},{}],12:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

    function EventEmitter() {
        this._events = this._events || {};
        this._maxListeners = this._maxListeners || undefined;
    }
    module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
    EventEmitter.EventEmitter = EventEmitter;

    EventEmitter.prototype._events = undefined;
    EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
    EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
    EventEmitter.prototype.setMaxListeners = function(n) {
        if (!isNumber(n) || n < 0 || isNaN(n))
            throw TypeError('n must be a positive number');
        this._maxListeners = n;
        return this;
    };

    EventEmitter.prototype.emit = function(type) {
        var er, handler, len, args, i, listeners;

        if (!this._events)
            this._events = {};

        // If there is no 'error' event listener then throw.
        if (type === 'error') {
            if (!this._events.error ||
                (isObject(this._events.error) && !this._events.error.length)) {
                er = arguments[1];
                if (er instanceof Error) {
                    throw er; // Unhandled 'error' event
                }
                throw TypeError('Uncaught, unspecified "error" event.');
            }
        }

        handler = this._events[type];

        if (isUndefined(handler))
            return false;

        if (isFunction(handler)) {
            switch (arguments.length) {
                // fast cases
                case 1:
                    handler.call(this);
                    break;
                case 2:
                    handler.call(this, arguments[1]);
                    break;
                case 3:
                    handler.call(this, arguments[1], arguments[2]);
                    break;
                // slower
                default:
                    len = arguments.length;
                    args = new Array(len - 1);
                    for (i = 1; i < len; i++)
                        args[i - 1] = arguments[i];
                    handler.apply(this, args);
            }
        } else if (isObject(handler)) {
            len = arguments.length;
            args = new Array(len - 1);
            for (i = 1; i < len; i++)
                args[i - 1] = arguments[i];

            listeners = handler.slice();
            len = listeners.length;
            for (i = 0; i < len; i++)
                listeners[i].apply(this, args);
        }

        return true;
    };

    EventEmitter.prototype.addListener = function(type, listener) {
        var m;

        if (!isFunction(listener))
            throw TypeError('listener must be a function');

        if (!this._events)
            this._events = {};

        // To avoid recursion in the case that type === "newListener"! Before
        // adding it to the listeners, first emit "newListener".
        if (this._events.newListener)
            this.emit('newListener', type,
                isFunction(listener.listener) ?
                    listener.listener : listener);

        if (!this._events[type])
        // Optimize the case of one listener. Don't need the extra array object.
            this._events[type] = listener;
        else if (isObject(this._events[type]))
        // If we've already got an array, just append.
            this._events[type].push(listener);
        else
        // Adding the second element, need to change to array.
            this._events[type] = [this._events[type], listener];

        // Check for listener leak
        if (isObject(this._events[type]) && !this._events[type].warned) {
            var m;
            if (!isUndefined(this._maxListeners)) {
                m = this._maxListeners;
            } else {
                m = EventEmitter.defaultMaxListeners;
            }

            if (m && m > 0 && this._events[type].length > m) {
                this._events[type].warned = true;
                console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
                if (typeof console.trace === 'function') {
                    // not supported in IE 10
                    console.trace();
                }
            }
        }

        return this;
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.once = function(type, listener) {
        if (!isFunction(listener))
            throw TypeError('listener must be a function');

        var fired = false;

        function g() {
            this.removeListener(type, g);

            if (!fired) {
                fired = true;
                listener.apply(this, arguments);
            }
        }

        g.listener = listener;
        this.on(type, g);

        return this;
    };

// emits a 'removeListener' event iff the listener was removed
    EventEmitter.prototype.removeListener = function(type, listener) {
        var list, position, length, i;

        if (!isFunction(listener))
            throw TypeError('listener must be a function');

        if (!this._events || !this._events[type])
            return this;

        list = this._events[type];
        length = list.length;
        position = -1;

        if (list === listener ||
            (isFunction(list.listener) && list.listener === listener)) {
            delete this._events[type];
            if (this._events.removeListener)
                this.emit('removeListener', type, listener);

        } else if (isObject(list)) {
            for (i = length; i-- > 0;) {
                if (list[i] === listener ||
                    (list[i].listener && list[i].listener === listener)) {
                    position = i;
                    break;
                }
            }

            if (position < 0)
                return this;

            if (list.length === 1) {
                list.length = 0;
                delete this._events[type];
            } else {
                list.splice(position, 1);
            }

            if (this._events.removeListener)
                this.emit('removeListener', type, listener);
        }

        return this;
    };

    EventEmitter.prototype.removeAllListeners = function(type) {
        var key, listeners;

        if (!this._events)
            return this;

        // not listening for removeListener, no need to emit
        if (!this._events.removeListener) {
            if (arguments.length === 0)
                this._events = {};
            else if (this._events[type])
                delete this._events[type];
            return this;
        }

        // emit removeListener for all listeners on all events
        if (arguments.length === 0) {
            for (key in this._events) {
                if (key === 'removeListener') continue;
                this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this._events = {};
            return this;
        }

        listeners = this._events[type];

        if (isFunction(listeners)) {
            this.removeListener(type, listeners);
        } else {
            // LIFO order
            while (listeners.length)
                this.removeListener(type, listeners[listeners.length - 1]);
        }
        delete this._events[type];

        return this;
    };

    EventEmitter.prototype.listeners = function(type) {
        var ret;
        if (!this._events || !this._events[type])
            ret = [];
        else if (isFunction(this._events[type]))
            ret = [this._events[type]];
        else
            ret = this._events[type].slice();
        return ret;
    };

    EventEmitter.listenerCount = function(emitter, type) {
        var ret;
        if (!emitter._events || !emitter._events[type])
            ret = 0;
        else if (isFunction(emitter._events[type]))
            ret = 1;
        else
            ret = emitter._events[type].length;
        return ret;
    };

    function isFunction(arg) {
        return typeof arg === 'function';
    }

    function isNumber(arg) {
        return typeof arg === 'number';
    }

    function isObject(arg) {
        return typeof arg === 'object' && arg !== null;
    }

    function isUndefined(arg) {
        return arg === void 0;
    }

},{}],13:[function(require,module,exports){
    var http = require('http');

    var https = module.exports;

    for (var key in http) {
        if (http.hasOwnProperty(key)) https[key] = http[key];
    };

    https.request = function (params, cb) {
        if (!params) params = {};
        params.scheme = 'https';
        return http.request.call(this, params, cb);
    }

},{"http":35}],14:[function(require,module,exports){
    if (typeof Object.create === 'function') {
        // implementation from standard node.js 'util' module
        module.exports = function inherits(ctor, superCtor) {
            ctor.super_ = superCtor
            ctor.prototype = Object.create(superCtor.prototype, {
                constructor: {
                    value: ctor,
                    enumerable: false,
                    writable: true,
                    configurable: true
                }
            });
        };
    } else {
        // old school shim for old browsers
        module.exports = function inherits(ctor, superCtor) {
            ctor.super_ = superCtor
            var TempCtor = function () {}
            TempCtor.prototype = superCtor.prototype
            ctor.prototype = new TempCtor()
            ctor.prototype.constructor = ctor
        }
    }

},{}],15:[function(require,module,exports){
    module.exports = Array.isArray || function (arr) {
            return Object.prototype.toString.call(arr) == '[object Array]';
        };

},{}],16:[function(require,module,exports){
// shim for using process in browser

    var process = module.exports = {};
    var queue = [];
    var draining = false;
    var currentQueue;
    var queueIndex = -1;

    function cleanUpNextTick() {
        draining = false;
        if (currentQueue.length) {
            queue = currentQueue.concat(queue);
        } else {
            queueIndex = -1;
        }
        if (queue.length) {
            drainQueue();
        }
    }

    function drainQueue() {
        if (draining) {
            return;
        }
        var timeout = setTimeout(cleanUpNextTick);
        draining = true;

        var len = queue.length;
        while(len) {
            currentQueue = queue;
            queue = [];
            while (++queueIndex < len) {
                currentQueue[queueIndex].run();
            }
            queueIndex = -1;
            len = queue.length;
        }
        currentQueue = null;
        draining = false;
        clearTimeout(timeout);
    }

    process.nextTick = function (fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
            for (var i = 1; i < arguments.length; i++) {
                args[i - 1] = arguments[i];
            }
        }
        queue.push(new Item(fun, args));
        if (queue.length === 1 && !draining) {
            setTimeout(drainQueue, 0);
        }
    };

// v8 likes predictible objects
    function Item(fun, array) {
        this.fun = fun;
        this.array = array;
    }
    Item.prototype.run = function () {
        this.fun.apply(null, this.array);
    };
    process.title = 'browser';
    process.browser = true;
    process.env = {};
    process.argv = [];
    process.version = ''; // empty string to avoid regexp issues
    process.versions = {};

    function noop() {}

    process.on = noop;
    process.addListener = noop;
    process.once = noop;
    process.off = noop;
    process.removeListener = noop;
    process.removeAllListeners = noop;
    process.emit = noop;

    process.binding = function (name) {
        throw new Error('process.binding is not supported');
    };

// TODO(shtylman)
    process.cwd = function () { return '/' };
    process.chdir = function (dir) {
        throw new Error('process.chdir is not supported');
    };
    process.umask = function() { return 0; };

},{}],17:[function(require,module,exports){
    (function (global){
        /*! https://mths.be/punycode v1.3.2 by @mathias */
        ;(function(root) {

            /** Detect free variables */
            var freeExports = typeof exports == 'object' && exports &&
                !exports.nodeType && exports;
            var freeModule = typeof module == 'object' && module &&
                !module.nodeType && module;
            var freeGlobal = typeof global == 'object' && global;
            if (
                freeGlobal.global === freeGlobal ||
                freeGlobal.window === freeGlobal ||
                freeGlobal.self === freeGlobal
            ) {
                root = freeGlobal;
            }

            /**
             * The `punycode` object.
             * @name punycode
             * @type Object
             */
            var punycode,

                /** Highest positive signed 32-bit float value */
                maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

                /** Bootstring parameters */
                base = 36,
                tMin = 1,
                tMax = 26,
                skew = 38,
                damp = 700,
                initialBias = 72,
                initialN = 128, // 0x80
                delimiter = '-', // '\x2D'

                /** Regular expressions */
                regexPunycode = /^xn--/,
                regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
                regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

                /** Error messages */
                errors = {
                    'overflow': 'Overflow: input needs wider integers to process',
                    'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
                    'invalid-input': 'Invalid input'
                },

                /** Convenience shortcuts */
                baseMinusTMin = base - tMin,
                floor = Math.floor,
                stringFromCharCode = String.fromCharCode,

                /** Temporary variable */
                key;

            /*--------------------------------------------------------------------------*/

            /**
             * A generic error utility function.
             * @private
             * @param {String} type The error type.
             * @returns {Error} Throws a `RangeError` with the applicable error message.
             */
            function error(type) {
                throw RangeError(errors[type]);
            }

            /**
             * A generic `Array#map` utility function.
             * @private
             * @param {Array} array The array to iterate over.
             * @param {Function} callback The function that gets called for every array
             * item.
             * @returns {Array} A new array of values returned by the callback function.
             */
            function map(array, fn) {
                var length = array.length;
                var result = [];
                while (length--) {
                    result[length] = fn(array[length]);
                }
                return result;
            }

            /**
             * A simple `Array#map`-like wrapper to work with domain name strings or email
             * addresses.
             * @private
             * @param {String} domain The domain name or email address.
             * @param {Function} callback The function that gets called for every
             * character.
             * @returns {Array} A new string of characters returned by the callback
             * function.
             */
            function mapDomain(string, fn) {
                var parts = string.split('@');
                var result = '';
                if (parts.length > 1) {
                    // In email addresses, only the domain name should be punycoded. Leave
                    // the local part (i.e. everything up to `@`) intact.
                    result = parts[0] + '@';
                    string = parts[1];
                }
                // Avoid `split(regex)` for IE8 compatibility. See #17.
                string = string.replace(regexSeparators, '\x2E');
                var labels = string.split('.');
                var encoded = map(labels, fn).join('.');
                return result + encoded;
            }

            /**
             * Creates an array containing the numeric code points of each Unicode
             * character in the string. While JavaScript uses UCS-2 internally,
             * this function will convert a pair of surrogate halves (each of which
             * UCS-2 exposes as separate characters) into a single code point,
             * matching UTF-16.
             * @see `punycode.ucs2.encode`
             * @see <https://mathiasbynens.be/notes/javascript-encoding>
             * @memberOf punycode.ucs2
             * @name decode
             * @param {String} string The Unicode input string (UCS-2).
             * @returns {Array} The new array of code points.
             */
            function ucs2decode(string) {
                var output = [],
                    counter = 0,
                    length = string.length,
                    value,
                    extra;
                while (counter < length) {
                    value = string.charCodeAt(counter++);
                    if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
                        // high surrogate, and there is a next character
                        extra = string.charCodeAt(counter++);
                        if ((extra & 0xFC00) == 0xDC00) { // low surrogate
                            output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
                        } else {
                            // unmatched surrogate; only append this code unit, in case the next
                            // code unit is the high surrogate of a surrogate pair
                            output.push(value);
                            counter--;
                        }
                    } else {
                        output.push(value);
                    }
                }
                return output;
            }

            /**
             * Creates a string based on an array of numeric code points.
             * @see `punycode.ucs2.decode`
             * @memberOf punycode.ucs2
             * @name encode
             * @param {Array} codePoints The array of numeric code points.
             * @returns {String} The new Unicode string (UCS-2).
             */
            function ucs2encode(array) {
                return map(array, function(value) {
                    var output = '';
                    if (value > 0xFFFF) {
                        value -= 0x10000;
                        output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
                        value = 0xDC00 | value & 0x3FF;
                    }
                    output += stringFromCharCode(value);
                    return output;
                }).join('');
            }

            /**
             * Converts a basic code point into a digit/integer.
             * @see `digitToBasic()`
             * @private
             * @param {Number} codePoint The basic numeric code point value.
             * @returns {Number} The numeric value of a basic code point (for use in
             * representing integers) in the range `0` to `base - 1`, or `base` if
             * the code point does not represent a value.
             */
            function basicToDigit(codePoint) {
                if (codePoint - 48 < 10) {
                    return codePoint - 22;
                }
                if (codePoint - 65 < 26) {
                    return codePoint - 65;
                }
                if (codePoint - 97 < 26) {
                    return codePoint - 97;
                }
                return base;
            }

            /**
             * Converts a digit/integer into a basic code point.
             * @see `basicToDigit()`
             * @private
             * @param {Number} digit The numeric value of a basic code point.
             * @returns {Number} The basic code point whose value (when used for
             * representing integers) is `digit`, which needs to be in the range
             * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
             * used; else, the lowercase form is used. The behavior is undefined
             * if `flag` is non-zero and `digit` has no uppercase form.
             */
            function digitToBasic(digit, flag) {
                //  0..25 map to ASCII a..z or A..Z
                // 26..35 map to ASCII 0..9
                return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
            }

            /**
             * Bias adaptation function as per section 3.4 of RFC 3492.
             * http://tools.ietf.org/html/rfc3492#section-3.4
             * @private
             */
            function adapt(delta, numPoints, firstTime) {
                var k = 0;
                delta = firstTime ? floor(delta / damp) : delta >> 1;
                delta += floor(delta / numPoints);
                for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
                    delta = floor(delta / baseMinusTMin);
                }
                return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
            }

            /**
             * Converts a Punycode string of ASCII-only symbols to a string of Unicode
             * symbols.
             * @memberOf punycode
             * @param {String} input The Punycode string of ASCII-only symbols.
             * @returns {String} The resulting string of Unicode symbols.
             */
            function decode(input) {
                // Don't use UCS-2
                var output = [],
                    inputLength = input.length,
                    out,
                    i = 0,
                    n = initialN,
                    bias = initialBias,
                    basic,
                    j,
                    index,
                    oldi,
                    w,
                    k,
                    digit,
                    t,
                    /** Cached calculation results */
                    baseMinusT;

                // Handle the basic code points: let `basic` be the number of input code
                // points before the last delimiter, or `0` if there is none, then copy
                // the first basic code points to the output.

                basic = input.lastIndexOf(delimiter);
                if (basic < 0) {
                    basic = 0;
                }

                for (j = 0; j < basic; ++j) {
                    // if it's not a basic code point
                    if (input.charCodeAt(j) >= 0x80) {
                        error('not-basic');
                    }
                    output.push(input.charCodeAt(j));
                }

                // Main decoding loop: start just after the last delimiter if any basic code
                // points were copied; start at the beginning otherwise.

                for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

                    // `index` is the index of the next character to be consumed.
                    // Decode a generalized variable-length integer into `delta`,
                    // which gets added to `i`. The overflow checking is easier
                    // if we increase `i` as we go, then subtract off its starting
                    // value at the end to obtain `delta`.
                    for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

                        if (index >= inputLength) {
                            error('invalid-input');
                        }

                        digit = basicToDigit(input.charCodeAt(index++));

                        if (digit >= base || digit > floor((maxInt - i) / w)) {
                            error('overflow');
                        }

                        i += digit * w;
                        t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

                        if (digit < t) {
                            break;
                        }

                        baseMinusT = base - t;
                        if (w > floor(maxInt / baseMinusT)) {
                            error('overflow');
                        }

                        w *= baseMinusT;

                    }

                    out = output.length + 1;
                    bias = adapt(i - oldi, out, oldi == 0);

                    // `i` was supposed to wrap around from `out` to `0`,
                    // incrementing `n` each time, so we'll fix that now:
                    if (floor(i / out) > maxInt - n) {
                        error('overflow');
                    }

                    n += floor(i / out);
                    i %= out;

                    // Insert `n` at position `i` of the output
                    output.splice(i++, 0, n);

                }

                return ucs2encode(output);
            }

            /**
             * Converts a string of Unicode symbols (e.g. a domain name label) to a
             * Punycode string of ASCII-only symbols.
             * @memberOf punycode
             * @param {String} input The string of Unicode symbols.
             * @returns {String} The resulting Punycode string of ASCII-only symbols.
             */
            function encode(input) {
                var n,
                    delta,
                    handledCPCount,
                    basicLength,
                    bias,
                    j,
                    m,
                    q,
                    k,
                    t,
                    currentValue,
                    output = [],
                    /** `inputLength` will hold the number of code points in `input`. */
                    inputLength,
                    /** Cached calculation results */
                    handledCPCountPlusOne,
                    baseMinusT,
                    qMinusT;

                // Convert the input in UCS-2 to Unicode
                input = ucs2decode(input);

                // Cache the length
                inputLength = input.length;

                // Initialize the state
                n = initialN;
                delta = 0;
                bias = initialBias;

                // Handle the basic code points
                for (j = 0; j < inputLength; ++j) {
                    currentValue = input[j];
                    if (currentValue < 0x80) {
                        output.push(stringFromCharCode(currentValue));
                    }
                }

                handledCPCount = basicLength = output.length;

                // `handledCPCount` is the number of code points that have been handled;
                // `basicLength` is the number of basic code points.

                // Finish the basic string - if it is not empty - with a delimiter
                if (basicLength) {
                    output.push(delimiter);
                }

                // Main encoding loop:
                while (handledCPCount < inputLength) {

                    // All non-basic code points < n have been handled already. Find the next
                    // larger one:
                    for (m = maxInt, j = 0; j < inputLength; ++j) {
                        currentValue = input[j];
                        if (currentValue >= n && currentValue < m) {
                            m = currentValue;
                        }
                    }

                    // Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
                    // but guard against overflow
                    handledCPCountPlusOne = handledCPCount + 1;
                    if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
                        error('overflow');
                    }

                    delta += (m - n) * handledCPCountPlusOne;
                    n = m;

                    for (j = 0; j < inputLength; ++j) {
                        currentValue = input[j];

                        if (currentValue < n && ++delta > maxInt) {
                            error('overflow');
                        }

                        if (currentValue == n) {
                            // Represent delta as a generalized variable-length integer
                            for (q = delta, k = base; /* no condition */; k += base) {
                                t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
                                if (q < t) {
                                    break;
                                }
                                qMinusT = q - t;
                                baseMinusT = base - t;
                                output.push(
                                    stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
                                );
                                q = floor(qMinusT / baseMinusT);
                            }

                            output.push(stringFromCharCode(digitToBasic(q, 0)));
                            bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
                            delta = 0;
                            ++handledCPCount;
                        }
                    }

                    ++delta;
                    ++n;

                }
                return output.join('');
            }

            /**
             * Converts a Punycode string representing a domain name or an email address
             * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
             * it doesn't matter if you call it on a string that has already been
             * converted to Unicode.
             * @memberOf punycode
             * @param {String} input The Punycoded domain name or email address to
             * convert to Unicode.
             * @returns {String} The Unicode representation of the given Punycode
             * string.
             */
            function toUnicode(input) {
                return mapDomain(input, function(string) {
                    return regexPunycode.test(string)
                        ? decode(string.slice(4).toLowerCase())
                        : string;
                });
            }

            /**
             * Converts a Unicode string representing a domain name or an email address to
             * Punycode. Only the non-ASCII parts of the domain name will be converted,
             * i.e. it doesn't matter if you call it with a domain that's already in
             * ASCII.
             * @memberOf punycode
             * @param {String} input The domain name or email address to convert, as a
             * Unicode string.
             * @returns {String} The Punycode representation of the given domain name or
             * email address.
             */
            function toASCII(input) {
                return mapDomain(input, function(string) {
                    return regexNonASCII.test(string)
                        ? 'xn--' + encode(string)
                        : string;
                });
            }

            /*--------------------------------------------------------------------------*/

            /** Define the public API */
            punycode = {
                /**
                 * A string representing the current Punycode.js version number.
                 * @memberOf punycode
                 * @type String
                 */
                'version': '1.3.2',
                /**
                 * An object of methods to convert from JavaScript's internal character
                 * representation (UCS-2) to Unicode code points, and back.
                 * @see <https://mathiasbynens.be/notes/javascript-encoding>
                 * @memberOf punycode
                 * @type Object
                 */
                'ucs2': {
                    'decode': ucs2decode,
                    'encode': ucs2encode
                },
                'decode': decode,
                'encode': encode,
                'toASCII': toASCII,
                'toUnicode': toUnicode
            };

            /** Expose `punycode` */
            // Some AMD build optimizers, like r.js, check for specific condition patterns
            // like the following:
            if (
                typeof define == 'function' &&
                typeof define.amd == 'object' &&
                define.amd
            ) {
                define('punycode', function() {
                    return punycode;
                });
            } else if (freeExports && freeModule) {
                if (module.exports == freeExports) { // in Node.js or RingoJS v0.8.0+
                    freeModule.exports = punycode;
                } else { // in Narwhal or RingoJS v0.7.0-
                    for (key in punycode) {
                        punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
                    }
                }
            } else { // in Rhino or a web browser
                root.punycode = punycode;
            }

        }(this));

    }).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],18:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

    'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
    function hasOwnProperty(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    }

    module.exports = function(qs, sep, eq, options) {
        sep = sep || '&';
        eq = eq || '=';
        var obj = {};

        if (typeof qs !== 'string' || qs.length === 0) {
            return obj;
        }

        var regexp = /\+/g;
        qs = qs.split(sep);

        var maxKeys = 1000;
        if (options && typeof options.maxKeys === 'number') {
            maxKeys = options.maxKeys;
        }

        var len = qs.length;
        // maxKeys <= 0 means that we should not limit keys count
        if (maxKeys > 0 && len > maxKeys) {
            len = maxKeys;
        }

        for (var i = 0; i < len; ++i) {
            var x = qs[i].replace(regexp, '%20'),
                idx = x.indexOf(eq),
                kstr, vstr, k, v;

            if (idx >= 0) {
                kstr = x.substr(0, idx);
                vstr = x.substr(idx + 1);
            } else {
                kstr = x;
                vstr = '';
            }

            k = decodeURIComponent(kstr);
            v = decodeURIComponent(vstr);

            if (!hasOwnProperty(obj, k)) {
                obj[k] = v;
            } else if (isArray(obj[k])) {
                obj[k].push(v);
            } else {
                obj[k] = [obj[k], v];
            }
        }

        return obj;
    };

    var isArray = Array.isArray || function (xs) {
            return Object.prototype.toString.call(xs) === '[object Array]';
        };

},{}],19:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

    'use strict';

    var stringifyPrimitive = function(v) {
        switch (typeof v) {
            case 'string':
                return v;

            case 'boolean':
                return v ? 'true' : 'false';

            case 'number':
                return isFinite(v) ? v : '';

            default:
                return '';
        }
    };

    module.exports = function(obj, sep, eq, name) {
        sep = sep || '&';
        eq = eq || '=';
        if (obj === null) {
            obj = undefined;
        }

        if (typeof obj === 'object') {
            return map(objectKeys(obj), function(k) {
                var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
                if (isArray(obj[k])) {
                    return map(obj[k], function(v) {
                        return ks + encodeURIComponent(stringifyPrimitive(v));
                    }).join(sep);
                } else {
                    return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
                }
            }).join(sep);

        }

        if (!name) return '';
        return encodeURIComponent(stringifyPrimitive(name)) + eq +
            encodeURIComponent(stringifyPrimitive(obj));
    };

    var isArray = Array.isArray || function (xs) {
            return Object.prototype.toString.call(xs) === '[object Array]';
        };

    function map (xs, f) {
        if (xs.map) return xs.map(f);
        var res = [];
        for (var i = 0; i < xs.length; i++) {
            res.push(f(xs[i], i));
        }
        return res;
    }

    var objectKeys = Object.keys || function (obj) {
            var res = [];
            for (var key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
            }
            return res;
        };

},{}],20:[function(require,module,exports){
    'use strict';

    exports.decode = exports.parse = require('./decode');
    exports.encode = exports.stringify = require('./encode');

},{"./decode":18,"./encode":19}],21:[function(require,module,exports){
    module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":22}],22:[function(require,module,exports){
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

    'use strict';

    /*<replacement>*/
    var objectKeys = Object.keys || function (obj) {
            var keys = [];
            for (var key in obj) keys.push(key);
            return keys;
        }
    /*</replacement>*/


    module.exports = Duplex;

    /*<replacement>*/
    var processNextTick = require('process-nextick-args');
    /*</replacement>*/



    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/

    var Readable = require('./_stream_readable');
    var Writable = require('./_stream_writable');

    util.inherits(Duplex, Readable);

    var keys = objectKeys(Writable.prototype);
    for (var v = 0; v < keys.length; v++) {
        var method = keys[v];
        if (!Duplex.prototype[method])
            Duplex.prototype[method] = Writable.prototype[method];
    }

    function Duplex(options) {
        if (!(this instanceof Duplex))
            return new Duplex(options);

        Readable.call(this, options);
        Writable.call(this, options);

        if (options && options.readable === false)
            this.readable = false;

        if (options && options.writable === false)
            this.writable = false;

        this.allowHalfOpen = true;
        if (options && options.allowHalfOpen === false)
            this.allowHalfOpen = false;

        this.once('end', onend);
    }

// the no-half-open enforcer
    function onend() {
        // if we allow half-open state, or if the writable side ended,
        // then we're ok.
        if (this.allowHalfOpen || this._writableState.ended)
            return;

        // no more data can be written.
        // But allow more writes to happen in this tick.
        processNextTick(onEndNT, this);
    }

    function onEndNT(self) {
        self.end();
    }

    function forEach (xs, f) {
        for (var i = 0, l = xs.length; i < l; i++) {
            f(xs[i], i);
        }
    }

},{"./_stream_readable":24,"./_stream_writable":26,"core-util-is":27,"inherits":14,"process-nextick-args":28}],23:[function(require,module,exports){
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

    'use strict';

    module.exports = PassThrough;

    var Transform = require('./_stream_transform');

    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/

    util.inherits(PassThrough, Transform);

    function PassThrough(options) {
        if (!(this instanceof PassThrough))
            return new PassThrough(options);

        Transform.call(this, options);
    }

    PassThrough.prototype._transform = function(chunk, encoding, cb) {
        cb(null, chunk);
    };

},{"./_stream_transform":25,"core-util-is":27,"inherits":14}],24:[function(require,module,exports){
    (function (process){
        'use strict';

        module.exports = Readable;

        /*<replacement>*/
        var processNextTick = require('process-nextick-args');
        /*</replacement>*/


        /*<replacement>*/
        var isArray = require('isarray');
        /*</replacement>*/


        /*<replacement>*/
        var Buffer = require('buffer').Buffer;
        /*</replacement>*/

        Readable.ReadableState = ReadableState;

        var EE = require('events').EventEmitter;

        /*<replacement>*/
        if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
            return emitter.listeners(type).length;
        };
        /*</replacement>*/



        /*<replacement>*/
        var Stream;
        (function (){try{
            Stream = require('st' + 'ream');
        }catch(_){}finally{
            if (!Stream)
                Stream = require('events').EventEmitter;
        }}())
        /*</replacement>*/

        var Buffer = require('buffer').Buffer;

        /*<replacement>*/
        var util = require('core-util-is');
        util.inherits = require('inherits');
        /*</replacement>*/



        /*<replacement>*/
        var debug = require('util');
        if (debug && debug.debuglog) {
            debug = debug.debuglog('stream');
        } else {
            debug = function () {};
        }
        /*</replacement>*/

        var StringDecoder;

        util.inherits(Readable, Stream);

        function ReadableState(options, stream) {
            var Duplex = require('./_stream_duplex');

            options = options || {};

            // object stream flag. Used to make read(n) ignore n and to
            // make all the buffer merging and length checks go away
            this.objectMode = !!options.objectMode;

            if (stream instanceof Duplex)
                this.objectMode = this.objectMode || !!options.readableObjectMode;

            // the point at which it stops calling _read() to fill the buffer
            // Note: 0 is a valid value, means "don't call _read preemptively ever"
            var hwm = options.highWaterMark;
            var defaultHwm = this.objectMode ? 16 : 16 * 1024;
            this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

            // cast to ints.
            this.highWaterMark = ~~this.highWaterMark;

            this.buffer = [];
            this.length = 0;
            this.pipes = null;
            this.pipesCount = 0;
            this.flowing = null;
            this.ended = false;
            this.endEmitted = false;
            this.reading = false;

            // a flag to be able to tell if the onwrite cb is called immediately,
            // or on a later tick.  We set this to true at first, because any
            // actions that shouldn't happen until "later" should generally also
            // not happen before the first write call.
            this.sync = true;

            // whenever we return null, then we set a flag to say
            // that we're awaiting a 'readable' event emission.
            this.needReadable = false;
            this.emittedReadable = false;
            this.readableListening = false;

            // Crypto is kind of old and crusty.  Historically, its default string
            // encoding is 'binary' so we have to make this configurable.
            // Everything else in the universe uses 'utf8', though.
            this.defaultEncoding = options.defaultEncoding || 'utf8';

            // when piping, we only care about 'readable' events that happen
            // after read()ing all the bytes and not getting any pushback.
            this.ranOut = false;

            // the number of writers that are awaiting a drain event in .pipe()s
            this.awaitDrain = 0;

            // if true, a maybeReadMore has been scheduled
            this.readingMore = false;

            this.decoder = null;
            this.encoding = null;
            if (options.encoding) {
                if (!StringDecoder)
                    StringDecoder = require('string_decoder/').StringDecoder;
                this.decoder = new StringDecoder(options.encoding);
                this.encoding = options.encoding;
            }
        }

        function Readable(options) {
            var Duplex = require('./_stream_duplex');

            if (!(this instanceof Readable))
                return new Readable(options);

            this._readableState = new ReadableState(options, this);

            // legacy
            this.readable = true;

            if (options && typeof options.read === 'function')
                this._read = options.read;

            Stream.call(this);
        }

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
        Readable.prototype.push = function(chunk, encoding) {
            var state = this._readableState;

            if (!state.objectMode && typeof chunk === 'string') {
                encoding = encoding || state.defaultEncoding;
                if (encoding !== state.encoding) {
                    chunk = new Buffer(chunk, encoding);
                    encoding = '';
                }
            }

            return readableAddChunk(this, state, chunk, encoding, false);
        };

// Unshift should *always* be something directly out of read()
        Readable.prototype.unshift = function(chunk) {
            var state = this._readableState;
            return readableAddChunk(this, state, chunk, '', true);
        };

        Readable.prototype.isPaused = function() {
            return this._readableState.flowing === false;
        };

        function readableAddChunk(stream, state, chunk, encoding, addToFront) {
            var er = chunkInvalid(state, chunk);
            if (er) {
                stream.emit('error', er);
            } else if (chunk === null) {
                state.reading = false;
                onEofChunk(stream, state);
            } else if (state.objectMode || chunk && chunk.length > 0) {
                if (state.ended && !addToFront) {
                    var e = new Error('stream.push() after EOF');
                    stream.emit('error', e);
                } else if (state.endEmitted && addToFront) {
                    var e = new Error('stream.unshift() after end event');
                    stream.emit('error', e);
                } else {
                    if (state.decoder && !addToFront && !encoding)
                        chunk = state.decoder.write(chunk);

                    if (!addToFront)
                        state.reading = false;

                    // if we want the data now, just emit it.
                    if (state.flowing && state.length === 0 && !state.sync) {
                        stream.emit('data', chunk);
                        stream.read(0);
                    } else {
                        // update the buffer info.
                        state.length += state.objectMode ? 1 : chunk.length;
                        if (addToFront)
                            state.buffer.unshift(chunk);
                        else
                            state.buffer.push(chunk);

                        if (state.needReadable)
                            emitReadable(stream);
                    }

                    maybeReadMore(stream, state);
                }
            } else if (!addToFront) {
                state.reading = false;
            }

            return needMoreData(state);
        }



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
        function needMoreData(state) {
            return !state.ended &&
                (state.needReadable ||
                state.length < state.highWaterMark ||
                state.length === 0);
        }

// backwards compatibility.
        Readable.prototype.setEncoding = function(enc) {
            if (!StringDecoder)
                StringDecoder = require('string_decoder/').StringDecoder;
            this._readableState.decoder = new StringDecoder(enc);
            this._readableState.encoding = enc;
            return this;
        };

// Don't raise the hwm > 128MB
        var MAX_HWM = 0x800000;
        function roundUpToNextPowerOf2(n) {
            if (n >= MAX_HWM) {
                n = MAX_HWM;
            } else {
                // Get the next highest power of 2
                n--;
                for (var p = 1; p < 32; p <<= 1) n |= n >> p;
                n++;
            }
            return n;
        }

        function howMuchToRead(n, state) {
            if (state.length === 0 && state.ended)
                return 0;

            if (state.objectMode)
                return n === 0 ? 0 : 1;

            if (n === null || isNaN(n)) {
                // only flow one buffer at a time
                if (state.flowing && state.buffer.length)
                    return state.buffer[0].length;
                else
                    return state.length;
            }

            if (n <= 0)
                return 0;

            // If we're asking for more than the target buffer level,
            // then raise the water mark.  Bump up to the next highest
            // power of 2, to prevent increasing it excessively in tiny
            // amounts.
            if (n > state.highWaterMark)
                state.highWaterMark = roundUpToNextPowerOf2(n);

            // don't have that much.  return null, unless we've ended.
            if (n > state.length) {
                if (!state.ended) {
                    state.needReadable = true;
                    return 0;
                } else {
                    return state.length;
                }
            }

            return n;
        }

// you can override either this method, or the async _read(n) below.
        Readable.prototype.read = function(n) {
            debug('read', n);
            var state = this._readableState;
            var nOrig = n;

            if (typeof n !== 'number' || n > 0)
                state.emittedReadable = false;

            // if we're doing read(0) to trigger a readable event, but we
            // already have a bunch of data in the buffer, then just trigger
            // the 'readable' event and move on.
            if (n === 0 &&
                state.needReadable &&
                (state.length >= state.highWaterMark || state.ended)) {
                debug('read: emitReadable', state.length, state.ended);
                if (state.length === 0 && state.ended)
                    endReadable(this);
                else
                    emitReadable(this);
                return null;
            }

            n = howMuchToRead(n, state);

            // if we've ended, and we're now clear, then finish it up.
            if (n === 0 && state.ended) {
                if (state.length === 0)
                    endReadable(this);
                return null;
            }

            // All the actual chunk generation logic needs to be
            // *below* the call to _read.  The reason is that in certain
            // synthetic stream cases, such as passthrough streams, _read
            // may be a completely synchronous operation which may change
            // the state of the read buffer, providing enough data when
            // before there was *not* enough.
            //
            // So, the steps are:
            // 1. Figure out what the state of things will be after we do
            // a read from the buffer.
            //
            // 2. If that resulting state will trigger a _read, then call _read.
            // Note that this may be asynchronous, or synchronous.  Yes, it is
            // deeply ugly to write APIs this way, but that still doesn't mean
            // that the Readable class should behave improperly, as streams are
            // designed to be sync/async agnostic.
            // Take note if the _read call is sync or async (ie, if the read call
            // has returned yet), so that we know whether or not it's safe to emit
            // 'readable' etc.
            //
            // 3. Actually pull the requested chunks out of the buffer and return.

            // if we need a readable event, then we need to do some reading.
            var doRead = state.needReadable;
            debug('need readable', doRead);

            // if we currently have less than the highWaterMark, then also read some
            if (state.length === 0 || state.length - n < state.highWaterMark) {
                doRead = true;
                debug('length less than watermark', doRead);
            }

            // however, if we've ended, then there's no point, and if we're already
            // reading, then it's unnecessary.
            if (state.ended || state.reading) {
                doRead = false;
                debug('reading or ended', doRead);
            }

            if (doRead) {
                debug('do read');
                state.reading = true;
                state.sync = true;
                // if the length is currently zero, then we *need* a readable event.
                if (state.length === 0)
                    state.needReadable = true;
                // call internal read method
                this._read(state.highWaterMark);
                state.sync = false;
            }

            // If _read pushed data synchronously, then `reading` will be false,
            // and we need to re-evaluate how much data we can return to the user.
            if (doRead && !state.reading)
                n = howMuchToRead(nOrig, state);

            var ret;
            if (n > 0)
                ret = fromList(n, state);
            else
                ret = null;

            if (ret === null) {
                state.needReadable = true;
                n = 0;
            }

            state.length -= n;

            // If we have nothing in the buffer, then we want to know
            // as soon as we *do* get something into the buffer.
            if (state.length === 0 && !state.ended)
                state.needReadable = true;

            // If we tried to read() past the EOF, then emit end on the next tick.
            if (nOrig !== n && state.ended && state.length === 0)
                endReadable(this);

            if (ret !== null)
                this.emit('data', ret);

            return ret;
        };

        function chunkInvalid(state, chunk) {
            var er = null;
            if (!(Buffer.isBuffer(chunk)) &&
                typeof chunk !== 'string' &&
                chunk !== null &&
                chunk !== undefined &&
                !state.objectMode) {
                er = new TypeError('Invalid non-string/buffer chunk');
            }
            return er;
        }


        function onEofChunk(stream, state) {
            if (state.ended) return;
            if (state.decoder) {
                var chunk = state.decoder.end();
                if (chunk && chunk.length) {
                    state.buffer.push(chunk);
                    state.length += state.objectMode ? 1 : chunk.length;
                }
            }
            state.ended = true;

            // emit 'readable' now to make sure it gets picked up.
            emitReadable(stream);
        }

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
        function emitReadable(stream) {
            var state = stream._readableState;
            state.needReadable = false;
            if (!state.emittedReadable) {
                debug('emitReadable', state.flowing);
                state.emittedReadable = true;
                if (state.sync)
                    processNextTick(emitReadable_, stream);
                else
                    emitReadable_(stream);
            }
        }

        function emitReadable_(stream) {
            debug('emit readable');
            stream.emit('readable');
            flow(stream);
        }


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
        function maybeReadMore(stream, state) {
            if (!state.readingMore) {
                state.readingMore = true;
                processNextTick(maybeReadMore_, stream, state);
            }
        }

        function maybeReadMore_(stream, state) {
            var len = state.length;
            while (!state.reading && !state.flowing && !state.ended &&
            state.length < state.highWaterMark) {
                debug('maybeReadMore read 0');
                stream.read(0);
                if (len === state.length)
                // didn't get any data, stop spinning.
                    break;
                else
                    len = state.length;
            }
            state.readingMore = false;
        }

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
        Readable.prototype._read = function(n) {
            this.emit('error', new Error('not implemented'));
        };

        Readable.prototype.pipe = function(dest, pipeOpts) {
            var src = this;
            var state = this._readableState;

            switch (state.pipesCount) {
                case 0:
                    state.pipes = dest;
                    break;
                case 1:
                    state.pipes = [state.pipes, dest];
                    break;
                default:
                    state.pipes.push(dest);
                    break;
            }
            state.pipesCount += 1;
            debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

            var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
                dest !== process.stdout &&
                dest !== process.stderr;

            var endFn = doEnd ? onend : cleanup;
            if (state.endEmitted)
                processNextTick(endFn);
            else
                src.once('end', endFn);

            dest.on('unpipe', onunpipe);
            function onunpipe(readable) {
                debug('onunpipe');
                if (readable === src) {
                    cleanup();
                }
            }

            function onend() {
                debug('onend');
                dest.end();
            }

            // when the dest drains, it reduces the awaitDrain counter
            // on the source.  This would be more elegant with a .once()
            // handler in flow(), but adding and removing repeatedly is
            // too slow.
            var ondrain = pipeOnDrain(src);
            dest.on('drain', ondrain);

            function cleanup() {
                debug('cleanup');
                // cleanup event handlers once the pipe is broken
                dest.removeListener('close', onclose);
                dest.removeListener('finish', onfinish);
                dest.removeListener('drain', ondrain);
                dest.removeListener('error', onerror);
                dest.removeListener('unpipe', onunpipe);
                src.removeListener('end', onend);
                src.removeListener('end', cleanup);
                src.removeListener('data', ondata);

                // if the reader is waiting for a drain event from this
                // specific writer, then it would cause it to never start
                // flowing again.
                // So, if this is awaiting a drain, then we just call it now.
                // If we don't know, then assume that we are waiting for one.
                if (state.awaitDrain &&
                    (!dest._writableState || dest._writableState.needDrain))
                    ondrain();
            }

            src.on('data', ondata);
            function ondata(chunk) {
                debug('ondata');
                var ret = dest.write(chunk);
                if (false === ret) {
                    debug('false write response, pause',
                        src._readableState.awaitDrain);
                    src._readableState.awaitDrain++;
                    src.pause();
                }
            }

            // if the dest has an error, then stop piping into it.
            // however, don't suppress the throwing behavior for this.
            function onerror(er) {
                debug('onerror', er);
                unpipe();
                dest.removeListener('error', onerror);
                if (EE.listenerCount(dest, 'error') === 0)
                    dest.emit('error', er);
            }
            // This is a brutally ugly hack to make sure that our error handler
            // is attached before any userland ones.  NEVER DO THIS.
            if (!dest._events || !dest._events.error)
                dest.on('error', onerror);
            else if (isArray(dest._events.error))
                dest._events.error.unshift(onerror);
            else
                dest._events.error = [onerror, dest._events.error];



            // Both close and finish should trigger unpipe, but only once.
            function onclose() {
                dest.removeListener('finish', onfinish);
                unpipe();
            }
            dest.once('close', onclose);
            function onfinish() {
                debug('onfinish');
                dest.removeListener('close', onclose);
                unpipe();
            }
            dest.once('finish', onfinish);

            function unpipe() {
                debug('unpipe');
                src.unpipe(dest);
            }

            // tell the dest that it's being piped to
            dest.emit('pipe', src);

            // start the flow if it hasn't been started already.
            if (!state.flowing) {
                debug('pipe resume');
                src.resume();
            }

            return dest;
        };

        function pipeOnDrain(src) {
            return function() {
                var state = src._readableState;
                debug('pipeOnDrain', state.awaitDrain);
                if (state.awaitDrain)
                    state.awaitDrain--;
                if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
                    state.flowing = true;
                    flow(src);
                }
            };
        }


        Readable.prototype.unpipe = function(dest) {
            var state = this._readableState;

            // if we're not piping anywhere, then do nothing.
            if (state.pipesCount === 0)
                return this;

            // just one destination.  most common case.
            if (state.pipesCount === 1) {
                // passed in one, but it's not the right one.
                if (dest && dest !== state.pipes)
                    return this;

                if (!dest)
                    dest = state.pipes;

                // got a match.
                state.pipes = null;
                state.pipesCount = 0;
                state.flowing = false;
                if (dest)
                    dest.emit('unpipe', this);
                return this;
            }

            // slow case. multiple pipe destinations.

            if (!dest) {
                // remove all.
                var dests = state.pipes;
                var len = state.pipesCount;
                state.pipes = null;
                state.pipesCount = 0;
                state.flowing = false;

                for (var i = 0; i < len; i++)
                    dests[i].emit('unpipe', this);
                return this;
            }

            // try to find the right one.
            var i = indexOf(state.pipes, dest);
            if (i === -1)
                return this;

            state.pipes.splice(i, 1);
            state.pipesCount -= 1;
            if (state.pipesCount === 1)
                state.pipes = state.pipes[0];

            dest.emit('unpipe', this);

            return this;
        };

// set up data events if they are asked for
// Ensure readable listeners eventually get something
        Readable.prototype.on = function(ev, fn) {
            var res = Stream.prototype.on.call(this, ev, fn);

            // If listening to data, and it has not explicitly been paused,
            // then call resume to start the flow of data on the next tick.
            if (ev === 'data' && false !== this._readableState.flowing) {
                this.resume();
            }

            if (ev === 'readable' && this.readable) {
                var state = this._readableState;
                if (!state.readableListening) {
                    state.readableListening = true;
                    state.emittedReadable = false;
                    state.needReadable = true;
                    if (!state.reading) {
                        processNextTick(nReadingNextTick, this);
                    } else if (state.length) {
                        emitReadable(this, state);
                    }
                }
            }

            return res;
        };
        Readable.prototype.addListener = Readable.prototype.on;

        function nReadingNextTick(self) {
            debug('readable nexttick read 0');
            self.read(0);
        }

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
        Readable.prototype.resume = function() {
            var state = this._readableState;
            if (!state.flowing) {
                debug('resume');
                state.flowing = true;
                resume(this, state);
            }
            return this;
        };

        function resume(stream, state) {
            if (!state.resumeScheduled) {
                state.resumeScheduled = true;
                processNextTick(resume_, stream, state);
            }
        }

        function resume_(stream, state) {
            if (!state.reading) {
                debug('resume read 0');
                stream.read(0);
            }

            state.resumeScheduled = false;
            stream.emit('resume');
            flow(stream);
            if (state.flowing && !state.reading)
                stream.read(0);
        }

        Readable.prototype.pause = function() {
            debug('call pause flowing=%j', this._readableState.flowing);
            if (false !== this._readableState.flowing) {
                debug('pause');
                this._readableState.flowing = false;
                this.emit('pause');
            }
            return this;
        };

        function flow(stream) {
            var state = stream._readableState;
            debug('flow', state.flowing);
            if (state.flowing) {
                do {
                    var chunk = stream.read();
                } while (null !== chunk && state.flowing);
            }
        }

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
        Readable.prototype.wrap = function(stream) {
            var state = this._readableState;
            var paused = false;

            var self = this;
            stream.on('end', function() {
                debug('wrapped end');
                if (state.decoder && !state.ended) {
                    var chunk = state.decoder.end();
                    if (chunk && chunk.length)
                        self.push(chunk);
                }

                self.push(null);
            });

            stream.on('data', function(chunk) {
                debug('wrapped data');
                if (state.decoder)
                    chunk = state.decoder.write(chunk);

                // don't skip over falsy values in objectMode
                if (state.objectMode && (chunk === null || chunk === undefined))
                    return;
                else if (!state.objectMode && (!chunk || !chunk.length))
                    return;

                var ret = self.push(chunk);
                if (!ret) {
                    paused = true;
                    stream.pause();
                }
            });

            // proxy all the other methods.
            // important when wrapping filters and duplexes.
            for (var i in stream) {
                if (this[i] === undefined && typeof stream[i] === 'function') {
                    this[i] = function(method) { return function() {
                        return stream[method].apply(stream, arguments);
                    }; }(i);
                }
            }

            // proxy certain important events.
            var events = ['error', 'close', 'destroy', 'pause', 'resume'];
            forEach(events, function(ev) {
                stream.on(ev, self.emit.bind(self, ev));
            });

            // when we try to consume some more bytes, simply unpause the
            // underlying stream.
            self._read = function(n) {
                debug('wrapped _read', n);
                if (paused) {
                    paused = false;
                    stream.resume();
                }
            };

            return self;
        };



// exposed for testing purposes only.
        Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
        function fromList(n, state) {
            var list = state.buffer;
            var length = state.length;
            var stringMode = !!state.decoder;
            var objectMode = !!state.objectMode;
            var ret;

            // nothing in the list, definitely empty.
            if (list.length === 0)
                return null;

            if (length === 0)
                ret = null;
            else if (objectMode)
                ret = list.shift();
            else if (!n || n >= length) {
                // read it all, truncate the array.
                if (stringMode)
                    ret = list.join('');
                else
                    ret = Buffer.concat(list, length);
                list.length = 0;
            } else {
                // read just some of it.
                if (n < list[0].length) {
                    // just take a part of the first list item.
                    // slice is the same for buffers and strings.
                    var buf = list[0];
                    ret = buf.slice(0, n);
                    list[0] = buf.slice(n);
                } else if (n === list[0].length) {
                    // first list is a perfect match
                    ret = list.shift();
                } else {
                    // complex case.
                    // we have enough to cover it, but it spans past the first buffer.
                    if (stringMode)
                        ret = '';
                    else
                        ret = new Buffer(n);

                    var c = 0;
                    for (var i = 0, l = list.length; i < l && c < n; i++) {
                        var buf = list[0];
                        var cpy = Math.min(n - c, buf.length);

                        if (stringMode)
                            ret += buf.slice(0, cpy);
                        else
                            buf.copy(ret, c, 0, cpy);

                        if (cpy < buf.length)
                            list[0] = buf.slice(cpy);
                        else
                            list.shift();

                        c += cpy;
                    }
                }
            }

            return ret;
        }

        function endReadable(stream) {
            var state = stream._readableState;

            // If we get here before consuming all the bytes, then that is a
            // bug in node.  Should never happen.
            if (state.length > 0)
                throw new Error('endReadable called on non-empty stream');

            if (!state.endEmitted) {
                state.ended = true;
                processNextTick(endReadableNT, state, stream);
            }
        }

        function endReadableNT(state, stream) {
            // Check that we didn't get one last unshift.
            if (!state.endEmitted && state.length === 0) {
                state.endEmitted = true;
                stream.readable = false;
                stream.emit('end');
            }
        }

        function forEach (xs, f) {
            for (var i = 0, l = xs.length; i < l; i++) {
                f(xs[i], i);
            }
        }

        function indexOf (xs, x) {
            for (var i = 0, l = xs.length; i < l; i++) {
                if (xs[i] === x) return i;
            }
            return -1;
        }

    }).call(this,require('_process'))
},{"./_stream_duplex":22,"_process":16,"buffer":8,"core-util-is":27,"events":12,"inherits":14,"isarray":15,"process-nextick-args":28,"string_decoder/":44,"util":7}],25:[function(require,module,exports){
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

    'use strict';

    module.exports = Transform;

    var Duplex = require('./_stream_duplex');

    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/

    util.inherits(Transform, Duplex);


    function TransformState(stream) {
        this.afterTransform = function(er, data) {
            return afterTransform(stream, er, data);
        };

        this.needTransform = false;
        this.transforming = false;
        this.writecb = null;
        this.writechunk = null;
    }

    function afterTransform(stream, er, data) {
        var ts = stream._transformState;
        ts.transforming = false;

        var cb = ts.writecb;

        if (!cb)
            return stream.emit('error', new Error('no writecb in Transform class'));

        ts.writechunk = null;
        ts.writecb = null;

        if (data !== null && data !== undefined)
            stream.push(data);

        if (cb)
            cb(er);

        var rs = stream._readableState;
        rs.reading = false;
        if (rs.needReadable || rs.length < rs.highWaterMark) {
            stream._read(rs.highWaterMark);
        }
    }


    function Transform(options) {
        if (!(this instanceof Transform))
            return new Transform(options);

        Duplex.call(this, options);

        this._transformState = new TransformState(this);

        // when the writable side finishes, then flush out anything remaining.
        var stream = this;

        // start out asking for a readable event once data is transformed.
        this._readableState.needReadable = true;

        // we have implemented the _read method, and done the other things
        // that Readable wants before the first _read call, so unset the
        // sync guard flag.
        this._readableState.sync = false;

        if (options) {
            if (typeof options.transform === 'function')
                this._transform = options.transform;

            if (typeof options.flush === 'function')
                this._flush = options.flush;
        }

        this.once('prefinish', function() {
            if (typeof this._flush === 'function')
                this._flush(function(er) {
                    done(stream, er);
                });
            else
                done(stream);
        });
    }

    Transform.prototype.push = function(chunk, encoding) {
        this._transformState.needTransform = false;
        return Duplex.prototype.push.call(this, chunk, encoding);
    };

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
    Transform.prototype._transform = function(chunk, encoding, cb) {
        throw new Error('not implemented');
    };

    Transform.prototype._write = function(chunk, encoding, cb) {
        var ts = this._transformState;
        ts.writecb = cb;
        ts.writechunk = chunk;
        ts.writeencoding = encoding;
        if (!ts.transforming) {
            var rs = this._readableState;
            if (ts.needTransform ||
                rs.needReadable ||
                rs.length < rs.highWaterMark)
                this._read(rs.highWaterMark);
        }
    };

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
    Transform.prototype._read = function(n) {
        var ts = this._transformState;

        if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
            ts.transforming = true;
            this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
        } else {
            // mark that we need a transform, so that any data that comes in
            // will get processed, now that we've asked for it.
            ts.needTransform = true;
        }
    };


    function done(stream, er) {
        if (er)
            return stream.emit('error', er);

        // if there's nothing in the write buffer, then that means
        // that nothing more will ever be provided
        var ws = stream._writableState;
        var ts = stream._transformState;

        if (ws.length)
            throw new Error('calling transform done when ws.length != 0');

        if (ts.transforming)
            throw new Error('calling transform done when still transforming');

        return stream.push(null);
    }

},{"./_stream_duplex":22,"core-util-is":27,"inherits":14}],26:[function(require,module,exports){
// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

    'use strict';

    module.exports = Writable;

    /*<replacement>*/
    var processNextTick = require('process-nextick-args');
    /*</replacement>*/


    /*<replacement>*/
    var Buffer = require('buffer').Buffer;
    /*</replacement>*/

    Writable.WritableState = WritableState;


    /*<replacement>*/
    var util = require('core-util-is');
    util.inherits = require('inherits');
    /*</replacement>*/



    /*<replacement>*/
    var Stream;
    (function (){try{
        Stream = require('st' + 'ream');
    }catch(_){}finally{
        if (!Stream)
            Stream = require('events').EventEmitter;
    }}())
    /*</replacement>*/

    var Buffer = require('buffer').Buffer;

    util.inherits(Writable, Stream);

    function nop() {}

    function WriteReq(chunk, encoding, cb) {
        this.chunk = chunk;
        this.encoding = encoding;
        this.callback = cb;
        this.next = null;
    }

    function WritableState(options, stream) {
        var Duplex = require('./_stream_duplex');

        options = options || {};

        // object stream flag to indicate whether or not this stream
        // contains buffers or objects.
        this.objectMode = !!options.objectMode;

        if (stream instanceof Duplex)
            this.objectMode = this.objectMode || !!options.writableObjectMode;

        // the point at which write() starts returning false
        // Note: 0 is a valid value, means that we always return false if
        // the entire buffer is not flushed immediately on write()
        var hwm = options.highWaterMark;
        var defaultHwm = this.objectMode ? 16 : 16 * 1024;
        this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

        // cast to ints.
        this.highWaterMark = ~~this.highWaterMark;

        this.needDrain = false;
        // at the start of calling end()
        this.ending = false;
        // when end() has been called, and returned
        this.ended = false;
        // when 'finish' is emitted
        this.finished = false;

        // should we decode strings into buffers before passing to _write?
        // this is here so that some node-core streams can optimize string
        // handling at a lower level.
        var noDecode = options.decodeStrings === false;
        this.decodeStrings = !noDecode;

        // Crypto is kind of old and crusty.  Historically, its default string
        // encoding is 'binary' so we have to make this configurable.
        // Everything else in the universe uses 'utf8', though.
        this.defaultEncoding = options.defaultEncoding || 'utf8';

        // not an actual buffer we keep track of, but a measurement
        // of how much we're waiting to get pushed to some underlying
        // socket or file.
        this.length = 0;

        // a flag to see when we're in the middle of a write.
        this.writing = false;

        // when true all writes will be buffered until .uncork() call
        this.corked = 0;

        // a flag to be able to tell if the onwrite cb is called immediately,
        // or on a later tick.  We set this to true at first, because any
        // actions that shouldn't happen until "later" should generally also
        // not happen before the first write call.
        this.sync = true;

        // a flag to know if we're processing previously buffered items, which
        // may call the _write() callback in the same tick, so that we don't
        // end up in an overlapped onwrite situation.
        this.bufferProcessing = false;

        // the callback that's passed to _write(chunk,cb)
        this.onwrite = function(er) {
            onwrite(stream, er);
        };

        // the callback that the user supplies to write(chunk,encoding,cb)
        this.writecb = null;

        // the amount that is being written when _write is called.
        this.writelen = 0;

        this.bufferedRequest = null;
        this.lastBufferedRequest = null;

        // number of pending user-supplied write callbacks
        // this must be 0 before 'finish' can be emitted
        this.pendingcb = 0;

        // emit prefinish if the only thing we're waiting for is _write cbs
        // This is relevant for synchronous Transform streams
        this.prefinished = false;

        // True if the error was already emitted and should not be thrown again
        this.errorEmitted = false;
    }

    WritableState.prototype.getBuffer = function writableStateGetBuffer() {
        var current = this.bufferedRequest;
        var out = [];
        while (current) {
            out.push(current);
            current = current.next;
        }
        return out;
    };

    (function (){try {
        Object.defineProperty(WritableState.prototype, 'buffer', {
            get: require('util-deprecate')(function() {
                return this.getBuffer();
            }, '_writableState.buffer is deprecated. Use ' +
                '_writableState.getBuffer() instead.')
        });
    }catch(_){}}());


    function Writable(options) {
        var Duplex = require('./_stream_duplex');

        // Writable ctor is applied to Duplexes, though they're not
        // instanceof Writable, they're instanceof Readable.
        if (!(this instanceof Writable) && !(this instanceof Duplex))
            return new Writable(options);

        this._writableState = new WritableState(options, this);

        // legacy.
        this.writable = true;

        if (options) {
            if (typeof options.write === 'function')
                this._write = options.write;

            if (typeof options.writev === 'function')
                this._writev = options.writev;
        }

        Stream.call(this);
    }

// Otherwise people can pipe Writable streams, which is just wrong.
    Writable.prototype.pipe = function() {
        this.emit('error', new Error('Cannot pipe. Not readable.'));
    };


    function writeAfterEnd(stream, cb) {
        var er = new Error('write after end');
        // TODO: defer error events consistently everywhere, not just the cb
        stream.emit('error', er);
        processNextTick(cb, er);
    }

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
    function validChunk(stream, state, chunk, cb) {
        var valid = true;

        if (!(Buffer.isBuffer(chunk)) &&
            typeof chunk !== 'string' &&
            chunk !== null &&
            chunk !== undefined &&
            !state.objectMode) {
            var er = new TypeError('Invalid non-string/buffer chunk');
            stream.emit('error', er);
            processNextTick(cb, er);
            valid = false;
        }
        return valid;
    }

    Writable.prototype.write = function(chunk, encoding, cb) {
        var state = this._writableState;
        var ret = false;

        if (typeof encoding === 'function') {
            cb = encoding;
            encoding = null;
        }

        if (Buffer.isBuffer(chunk))
            encoding = 'buffer';
        else if (!encoding)
            encoding = state.defaultEncoding;

        if (typeof cb !== 'function')
            cb = nop;

        if (state.ended)
            writeAfterEnd(this, cb);
        else if (validChunk(this, state, chunk, cb)) {
            state.pendingcb++;
            ret = writeOrBuffer(this, state, chunk, encoding, cb);
        }

        return ret;
    };

    Writable.prototype.cork = function() {
        var state = this._writableState;

        state.corked++;
    };

    Writable.prototype.uncork = function() {
        var state = this._writableState;

        if (state.corked) {
            state.corked--;

            if (!state.writing &&
                !state.corked &&
                !state.finished &&
                !state.bufferProcessing &&
                state.bufferedRequest)
                clearBuffer(this, state);
        }
    };

    Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
        // node::ParseEncoding() requires lower case.
        if (typeof encoding === 'string')
            encoding = encoding.toLowerCase();
        if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64',
                'ucs2', 'ucs-2','utf16le', 'utf-16le', 'raw']
                .indexOf((encoding + '').toLowerCase()) > -1))
            throw new TypeError('Unknown encoding: ' + encoding);
        this._writableState.defaultEncoding = encoding;
    };

    function decodeChunk(state, chunk, encoding) {
        if (!state.objectMode &&
            state.decodeStrings !== false &&
            typeof chunk === 'string') {
            chunk = new Buffer(chunk, encoding);
        }
        return chunk;
    }

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
    function writeOrBuffer(stream, state, chunk, encoding, cb) {
        chunk = decodeChunk(state, chunk, encoding);

        if (Buffer.isBuffer(chunk))
            encoding = 'buffer';
        var len = state.objectMode ? 1 : chunk.length;

        state.length += len;

        var ret = state.length < state.highWaterMark;
        // we must ensure that previous needDrain will not be reset to false.
        if (!ret)
            state.needDrain = true;

        if (state.writing || state.corked) {
            var last = state.lastBufferedRequest;
            state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
            if (last) {
                last.next = state.lastBufferedRequest;
            } else {
                state.bufferedRequest = state.lastBufferedRequest;
            }
        } else {
            doWrite(stream, state, false, len, chunk, encoding, cb);
        }

        return ret;
    }

    function doWrite(stream, state, writev, len, chunk, encoding, cb) {
        state.writelen = len;
        state.writecb = cb;
        state.writing = true;
        state.sync = true;
        if (writev)
            stream._writev(chunk, state.onwrite);
        else
            stream._write(chunk, encoding, state.onwrite);
        state.sync = false;
    }

    function onwriteError(stream, state, sync, er, cb) {
        --state.pendingcb;
        if (sync)
            processNextTick(cb, er);
        else
            cb(er);

        stream._writableState.errorEmitted = true;
        stream.emit('error', er);
    }

    function onwriteStateUpdate(state) {
        state.writing = false;
        state.writecb = null;
        state.length -= state.writelen;
        state.writelen = 0;
    }

    function onwrite(stream, er) {
        var state = stream._writableState;
        var sync = state.sync;
        var cb = state.writecb;

        onwriteStateUpdate(state);

        if (er)
            onwriteError(stream, state, sync, er, cb);
        else {
            // Check if we're actually ready to finish, but don't emit yet
            var finished = needFinish(state);

            if (!finished &&
                !state.corked &&
                !state.bufferProcessing &&
                state.bufferedRequest) {
                clearBuffer(stream, state);
            }

            if (sync) {
                processNextTick(afterWrite, stream, state, finished, cb);
            } else {
                afterWrite(stream, state, finished, cb);
            }
        }
    }

    function afterWrite(stream, state, finished, cb) {
        if (!finished)
            onwriteDrain(stream, state);
        state.pendingcb--;
        cb();
        finishMaybe(stream, state);
    }

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
    function onwriteDrain(stream, state) {
        if (state.length === 0 && state.needDrain) {
            state.needDrain = false;
            stream.emit('drain');
        }
    }


// if there's something in the buffer waiting, then process it
    function clearBuffer(stream, state) {
        state.bufferProcessing = true;
        var entry = state.bufferedRequest;

        if (stream._writev && entry && entry.next) {
            // Fast case, write everything using _writev()
            var buffer = [];
            var cbs = [];
            while (entry) {
                cbs.push(entry.callback);
                buffer.push(entry);
                entry = entry.next;
            }

            // count the one we are adding, as well.
            // TODO(isaacs) clean this up
            state.pendingcb++;
            state.lastBufferedRequest = null;
            doWrite(stream, state, true, state.length, buffer, '', function(err) {
                for (var i = 0; i < cbs.length; i++) {
                    state.pendingcb--;
                    cbs[i](err);
                }
            });

            // Clear buffer
        } else {
            // Slow case, write chunks one-by-one
            while (entry) {
                var chunk = entry.chunk;
                var encoding = entry.encoding;
                var cb = entry.callback;
                var len = state.objectMode ? 1 : chunk.length;

                doWrite(stream, state, false, len, chunk, encoding, cb);
                entry = entry.next;
                // if we didn't call the onwrite immediately, then
                // it means that we need to wait until it does.
                // also, that means that the chunk and cb are currently
                // being processed, so move the buffer counter past them.
                if (state.writing) {
                    break;
                }
            }

            if (entry === null)
                state.lastBufferedRequest = null;
        }
        state.bufferedRequest = entry;
        state.bufferProcessing = false;
    }

    Writable.prototype._write = function(chunk, encoding, cb) {
        cb(new Error('not implemented'));
    };

    Writable.prototype._writev = null;

    Writable.prototype.end = function(chunk, encoding, cb) {
        var state = this._writableState;

        if (typeof chunk === 'function') {
            cb = chunk;
            chunk = null;
            encoding = null;
        } else if (typeof encoding === 'function') {
            cb = encoding;
            encoding = null;
        }

        if (chunk !== null && chunk !== undefined)
            this.write(chunk, encoding);

        // .end() fully uncorks
        if (state.corked) {
            state.corked = 1;
            this.uncork();
        }

        // ignore unnecessary end() calls.
        if (!state.ending && !state.finished)
            endWritable(this, state, cb);
    };


    function needFinish(state) {
        return (state.ending &&
        state.length === 0 &&
        state.bufferedRequest === null &&
        !state.finished &&
        !state.writing);
    }

    function prefinish(stream, state) {
        if (!state.prefinished) {
            state.prefinished = true;
            stream.emit('prefinish');
        }
    }

    function finishMaybe(stream, state) {
        var need = needFinish(state);
        if (need) {
            if (state.pendingcb === 0) {
                prefinish(stream, state);
                state.finished = true;
                stream.emit('finish');
            } else {
                prefinish(stream, state);
            }
        }
        return need;
    }

    function endWritable(stream, state, cb) {
        state.ending = true;
        finishMaybe(stream, state);
        if (cb) {
            if (state.finished)
                processNextTick(cb);
            else
                stream.once('finish', cb);
        }
        state.ended = true;
    }

},{"./_stream_duplex":22,"buffer":8,"core-util-is":27,"events":12,"inherits":14,"process-nextick-args":28,"util-deprecate":29}],27:[function(require,module,exports){
    (function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
        function isArray(ar) {
            return Array.isArray(ar);
        }
        exports.isArray = isArray;

        function isBoolean(arg) {
            return typeof arg === 'boolean';
        }
        exports.isBoolean = isBoolean;

        function isNull(arg) {
            return arg === null;
        }
        exports.isNull = isNull;

        function isNullOrUndefined(arg) {
            return arg == null;
        }
        exports.isNullOrUndefined = isNullOrUndefined;

        function isNumber(arg) {
            return typeof arg === 'number';
        }
        exports.isNumber = isNumber;

        function isString(arg) {
            return typeof arg === 'string';
        }
        exports.isString = isString;

        function isSymbol(arg) {
            return typeof arg === 'symbol';
        }
        exports.isSymbol = isSymbol;

        function isUndefined(arg) {
            return arg === void 0;
        }
        exports.isUndefined = isUndefined;

        function isRegExp(re) {
            return isObject(re) && objectToString(re) === '[object RegExp]';
        }
        exports.isRegExp = isRegExp;

        function isObject(arg) {
            return typeof arg === 'object' && arg !== null;
        }
        exports.isObject = isObject;

        function isDate(d) {
            return isObject(d) && objectToString(d) === '[object Date]';
        }
        exports.isDate = isDate;

        function isError(e) {
            return isObject(e) &&
                (objectToString(e) === '[object Error]' || e instanceof Error);
        }
        exports.isError = isError;

        function isFunction(arg) {
            return typeof arg === 'function';
        }
        exports.isFunction = isFunction;

        function isPrimitive(arg) {
            return arg === null ||
                typeof arg === 'boolean' ||
                typeof arg === 'number' ||
                typeof arg === 'string' ||
                typeof arg === 'symbol' ||  // ES6 symbol
                typeof arg === 'undefined';
        }
        exports.isPrimitive = isPrimitive;

        function isBuffer(arg) {
            return Buffer.isBuffer(arg);
        }
        exports.isBuffer = isBuffer;

        function objectToString(o) {
            return Object.prototype.toString.call(o);
        }
    }).call(this,require("buffer").Buffer)
},{"buffer":8}],28:[function(require,module,exports){
    (function (process){
        'use strict';
        module.exports = nextTick;

        function nextTick(fn) {
            var args = new Array(arguments.length - 1);
            var i = 0;
            while (i < arguments.length) {
                args[i++] = arguments[i];
            }
            process.nextTick(function afterTick() {
                fn.apply(null, args);
            });
        }

    }).call(this,require('_process'))
},{"_process":16}],29:[function(require,module,exports){
    (function (global){

        /**
         * Module exports.
         */

        module.exports = deprecate;

        /**
         * Mark that a method should not be used.
         * Returns a modified function which warns once by default.
         *
         * If `localStorage.noDeprecation = true` is set, then it is a no-op.
         *
         * If `localStorage.throwDeprecation = true` is set, then deprecated functions
         * will throw an Error when invoked.
         *
         * If `localStorage.traceDeprecation = true` is set, then deprecated functions
         * will invoke `console.trace()` instead of `console.error()`.
         *
         * @param {Function} fn - the function to deprecate
         * @param {String} msg - the string to print to the console when `fn` is invoked
         * @returns {Function} a new "deprecated" version of `fn`
         * @api public
         */

        function deprecate (fn, msg) {
            if (config('noDeprecation')) {
                return fn;
            }

            var warned = false;
            function deprecated() {
                if (!warned) {
                    if (config('throwDeprecation')) {
                        throw new Error(msg);
                    } else if (config('traceDeprecation')) {
                        console.trace(msg);
                    } else {
                        console.warn(msg);
                    }
                    warned = true;
                }
                return fn.apply(this, arguments);
            }

            return deprecated;
        }

        /**
         * Checks `localStorage` for boolean values for the given `name`.
         *
         * @param {String} name
         * @returns {Boolean}
         * @api private
         */

        function config (name) {
            if (!global.localStorage) return false;
            var val = global.localStorage[name];
            if (null == val) return false;
            return String(val).toLowerCase() === 'true';
        }

    }).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],30:[function(require,module,exports){
    module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":23}],31:[function(require,module,exports){
    var Stream = (function (){
        try {
            return require('st' + 'ream'); // hack to fix a circular dependency issue when used with browserify
        } catch(_){}
    }());
    exports = module.exports = require('./lib/_stream_readable.js');
    exports.Stream = Stream || exports;
    exports.Readable = exports;
    exports.Writable = require('./lib/_stream_writable.js');
    exports.Duplex = require('./lib/_stream_duplex.js');
    exports.Transform = require('./lib/_stream_transform.js');
    exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":22,"./lib/_stream_passthrough.js":23,"./lib/_stream_readable.js":24,"./lib/_stream_transform.js":25,"./lib/_stream_writable.js":26}],32:[function(require,module,exports){
    module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":25}],33:[function(require,module,exports){
    module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":26}],34:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

    module.exports = Stream;

    var EE = require('events').EventEmitter;
    var inherits = require('inherits');

    inherits(Stream, EE);
    Stream.Readable = require('readable-stream/readable.js');
    Stream.Writable = require('readable-stream/writable.js');
    Stream.Duplex = require('readable-stream/duplex.js');
    Stream.Transform = require('readable-stream/transform.js');
    Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
    Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

    function Stream() {
        EE.call(this);
    }

    Stream.prototype.pipe = function(dest, options) {
        var source = this;

        function ondata(chunk) {
            if (dest.writable) {
                if (false === dest.write(chunk) && source.pause) {
                    source.pause();
                }
            }
        }

        source.on('data', ondata);

        function ondrain() {
            if (source.readable && source.resume) {
                source.resume();
            }
        }

        dest.on('drain', ondrain);

        // If the 'end' option is not supplied, dest.end() will be called when
        // source gets the 'end' or 'close' events.  Only dest.end() once.
        if (!dest._isStdio && (!options || options.end !== false)) {
            source.on('end', onend);
            source.on('close', onclose);
        }

        var didOnEnd = false;
        function onend() {
            if (didOnEnd) return;
            didOnEnd = true;

            dest.end();
        }


        function onclose() {
            if (didOnEnd) return;
            didOnEnd = true;

            if (typeof dest.destroy === 'function') dest.destroy();
        }

        // don't leave dangling pipes when there are errors.
        function onerror(er) {
            cleanup();
            if (EE.listenerCount(this, 'error') === 0) {
                throw er; // Unhandled stream error in pipe.
            }
        }

        source.on('error', onerror);
        dest.on('error', onerror);

        // remove all the event listeners that were added.
        function cleanup() {
            source.removeListener('data', ondata);
            dest.removeListener('drain', ondrain);

            source.removeListener('end', onend);
            source.removeListener('close', onclose);

            source.removeListener('error', onerror);
            dest.removeListener('error', onerror);

            source.removeListener('end', cleanup);
            source.removeListener('close', cleanup);

            dest.removeListener('close', cleanup);
        }

        source.on('end', cleanup);
        source.on('close', cleanup);

        dest.on('close', cleanup);

        dest.emit('pipe', source);

        // Allow for unix-like usage: A.pipe(B).pipe(C)
        return dest;
    };

},{"events":12,"inherits":14,"readable-stream/duplex.js":21,"readable-stream/passthrough.js":30,"readable-stream/readable.js":31,"readable-stream/transform.js":32,"readable-stream/writable.js":33}],35:[function(require,module,exports){
    var ClientRequest = require('./lib/request')
    var extend = require('xtend')
    var statusCodes = require('builtin-status-codes')
    var url = require('url')

    var http = exports

    http.request = function (opts, cb) {
        if (typeof opts === 'string')
            opts = url.parse(opts)
        else
            opts = extend(opts)

        // Split opts.host into its components
        var hostHostname = opts.host ? opts.host.split(':')[0] : null
        var hostPort = opts.host ? parseInt(opts.host.split(':')[1], 10) : null

        opts.method = opts.method || 'GET'
        opts.headers = opts.headers || {}
        opts.path = opts.path || '/'
        opts.protocol = opts.protocol || window.location.protocol
        // If the hostname is provided, use the default port for the protocol. If
        // the url is instead relative, use window.location.port
        var defaultPort = (opts.hostname || hostHostname) ? (opts.protocol === 'https:' ? 443 : 80) : window.location.port
        opts.hostname = opts.hostname || hostHostname || window.location.hostname
        opts.port = opts.port || hostPort || defaultPort

        // Also valid opts.auth, opts.mode

        var req = new ClientRequest(opts)
        if (cb)
            req.on('response', cb)
        return req
    }

    http.get = function get (opts, cb) {
        var req = http.request(opts, cb)
        req.end()
        return req
    }

    http.Agent = function () {}
    http.Agent.defaultMaxSockets = 4

    http.STATUS_CODES = statusCodes

    http.METHODS = [
        'CHECKOUT',
        'CONNECT',
        'COPY',
        'DELETE',
        'GET',
        'HEAD',
        'LOCK',
        'M-SEARCH',
        'MERGE',
        'MKACTIVITY',
        'MKCOL',
        'MOVE',
        'NOTIFY',
        'OPTIONS',
        'PATCH',
        'POST',
        'PROPFIND',
        'PROPPATCH',
        'PURGE',
        'PUT',
        'REPORT',
        'SEARCH',
        'SUBSCRIBE',
        'TRACE',
        'UNLOCK',
        'UNSUBSCRIBE'
    ]
},{"./lib/request":37,"builtin-status-codes":39,"url":45,"xtend":48}],36:[function(require,module,exports){
    exports.fetch = isFunction(window.fetch) && isFunction(window.ReadableByteStream)

    exports.blobConstructor = false
    try {
        new Blob([new ArrayBuffer(1)])
        exports.blobConstructor = true
    } catch (e) {}

    var xhr = new window.XMLHttpRequest()
    xhr.open('GET', '/')

    function checkTypeSupport (type) {
        try {
            xhr.responseType = type
            return xhr.responseType === type
        } catch (e) {}
        return false
    }

// For some strange reason, Safari 7.0 reports typeof window.ArrayBuffer === 'object'.
// Safari 7.1 appears to have fixed this bug.
    var haveArrayBuffer = typeof window.ArrayBuffer !== 'undefined'
    var haveSlice = haveArrayBuffer && isFunction(window.ArrayBuffer.prototype.slice)

    exports.arraybuffer = haveArrayBuffer && checkTypeSupport('arraybuffer')
// These next two tests unavoidably show warnings in Chrome. Since fetch will always
// be used if it's available, just return false for these to avoid the warnings.
    exports.msstream = !exports.fetch && haveSlice && checkTypeSupport('ms-stream')
    exports.mozchunkedarraybuffer = !exports.fetch && haveArrayBuffer &&
        checkTypeSupport('moz-chunked-arraybuffer')
    exports.overrideMimeType = isFunction(xhr.overrideMimeType)
    exports.vbArray = isFunction(window.VBArray)

    function isFunction (value) {
        return typeof value === 'function'
    }

    xhr = null // Help gc

},{}],37:[function(require,module,exports){
    (function (process,Buffer){
// var Base64 = require('Base64')
        var capability = require('./capability')
        var foreach = require('foreach')
        var indexOf = require('indexof')
        var inherits = require('inherits')
        var keys = require('object-keys')
        var response = require('./response')
        var stream = require('stream')

        var IncomingMessage = response.IncomingMessage
        var rStates = response.readyStates

        function decideMode (preferBinary) {
            if (capability.fetch) {
                return 'fetch'
            } else if (capability.mozchunkedarraybuffer) {
                return 'moz-chunked-arraybuffer'
            } else if (capability.msstream) {
                return 'ms-stream'
            } else if (capability.arraybuffer && preferBinary) {
                return 'arraybuffer'
            } else if (capability.vbArray && preferBinary) {
                return 'text:vbarray'
            } else {
                return 'text'
            }
        }

        var ClientRequest = module.exports = function (opts) {
            var self = this
            stream.Writable.call(self)

            self._opts = opts
            self._url = opts.protocol + '//' + opts.hostname + ':' + opts.port + opts.path
            self._body = []
            self._headers = {}
            if (opts.auth)
                self.setHeader('Authorization', 'Basic ' + new Buffer(opts.auth).toString('base64'))
            foreach(keys(opts.headers), function (name) {
                self.setHeader(name, opts.headers[name])
            })

            var preferBinary
            if (opts.mode === 'prefer-streaming') {
                // If streaming is a high priority but binary compatibility and
                // the accuracy of the 'content-type' header aren't
                preferBinary = false
            } else if (opts.mode === 'allow-wrong-content-type') {
                // If streaming is more important than preserving the 'content-type' header
                preferBinary = !capability.overrideMimeType
            } else if (!opts.mode || opts.mode === 'default' || opts.mode === 'prefer-fast') {
                // Use binary if text streaming may corrupt data or the content-type header, or for speed
                preferBinary = true
            } else {
                throw new Error('Invalid value for opts.mode')
            }
            self._mode = decideMode(preferBinary)

            self.on('finish', function () {
                self._onFinish()
            })
        }

        inherits(ClientRequest, stream.Writable)

        ClientRequest.prototype.setHeader = function (name, value) {
            var self = this
            var lowerName = name.toLowerCase()
            // This check is not necessary, but it prevents warnings from browsers about setting unsafe
            // headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
            // http-browserify did it, so I will too.
            if (indexOf(unsafeHeaders, lowerName) !== -1)
                return

            self._headers[lowerName] = {
                name: name,
                value: value
            }
        }

        ClientRequest.prototype.getHeader = function (name) {
            var self = this
            return self._headers[name.toLowerCase()].value
        }

        ClientRequest.prototype.removeHeader = function (name) {
            var self = this
            delete self._headers[name.toLowerCase()]
        }

        ClientRequest.prototype._onFinish = function () {
            var self = this

            if (self._destroyed)
                return
            var opts = self._opts

            var headersObj = self._headers
            var body
            if (opts.method === 'POST' || opts.method === 'PUT') {
                if (capability.blobConstructor) {
                    body = new window.Blob(self._body.map(function (buffer) {
                        return buffer.toArrayBuffer()
                    }), {
                        type: (headersObj['content-type'] || {}).value || ''
                    })
                } else {
                    // get utf8 string
                    body = Buffer.concat(self._body).toString()
                }
            }

            if (self._mode === 'fetch') {
                var headers = keys(headersObj).map(function (name) {
                    return [headersObj[name].name, headersObj[name].value]
                })

                window.fetch(self._url, {
                    method: self._opts.method,
                    headers: headers,
                    body: body,
                    mode: 'cors',
                    credentials: opts.withCredentials ? 'include' : 'same-origin'
                }).then(function (response) {
                    self._fetchResponse = response
                    self._connect()
                }).then(undefined, function (reason) {
                    self.emit('error', reason)
                })
            } else {
                var xhr = self._xhr = new window.XMLHttpRequest()
                try {
                    xhr.open(self._opts.method, self._url, true)
                } catch (err) {
                    process.nextTick(function () {
                        self.emit('error', err)
                    })
                    return
                }

                // Can't set responseType on really old browsers
                if ('responseType' in xhr)
                    xhr.responseType = self._mode.split(':')[0]

                if ('withCredentials' in xhr)
                    xhr.withCredentials = !!opts.withCredentials

                if (self._mode === 'text' && 'overrideMimeType' in xhr)
                    xhr.overrideMimeType('text/plain; charset=x-user-defined')

                foreach(keys(headersObj), function (name) {
                    xhr.setRequestHeader(headersObj[name].name, headersObj[name].value)
                })

                self._response = null
                xhr.onreadystatechange = function () {
                    switch (xhr.readyState) {
                        case rStates.LOADING:
                        case rStates.DONE:
                            self._onXHRProgress()
                            break
                    }
                }
                // Necessary for streaming in Firefox, since xhr.response is ONLY defined
                // in onprogress, not in onreadystatechange with xhr.readyState = 3
                if (self._mode === 'moz-chunked-arraybuffer') {
                    xhr.onprogress = function () {
                        self._onXHRProgress()
                    }
                }

                xhr.onerror = function () {
                    if (self._destroyed)
                        return
                    self.emit('error', new Error('XHR error'))
                }

                try {
                    xhr.send(body)
                } catch (err) {
                    process.nextTick(function () {
                        self.emit('error', err)
                    })
                    return
                }
            }
        }

        /**
         * Checks if xhr.status is readable. Even though the spec says it should
         * be available in readyState 3, accessing it throws an exception in IE8
         */
        function statusValid (xhr) {
            try {
                return (xhr.status !== null)
            } catch (e) {
                return false
            }
        }

        ClientRequest.prototype._onXHRProgress = function () {
            var self = this

            if (!statusValid(self._xhr) || self._destroyed)
                return

            if (!self._response)
                self._connect()

            self._response._onXHRProgress()
        }

        ClientRequest.prototype._connect = function () {
            var self = this

            if (self._destroyed)
                return

            self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode)
            self.emit('response', self._response)
        }

        ClientRequest.prototype._write = function (chunk, encoding, cb) {
            var self = this

            self._body.push(chunk)
            cb()
        }

        ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function () {
            var self = this
            self._destroyed = true
            if (self._response)
                self._response._destroyed = true
            if (self._xhr)
                self._xhr.abort()
            // Currently, there isn't a way to truly abort a fetch.
            // If you like bikeshedding, see https://github.com/whatwg/fetch/issues/27
        }

        ClientRequest.prototype.end = function (data, encoding, cb) {
            var self = this
            if (typeof data === 'function') {
                cb = data
                data = undefined
            }

            stream.Writable.prototype.end.call(self, data, encoding, cb)
        }

        ClientRequest.prototype.flushHeaders = function () {}
        ClientRequest.prototype.setTimeout = function () {}
        ClientRequest.prototype.setNoDelay = function () {}
        ClientRequest.prototype.setSocketKeepAlive = function () {}

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
        var unsafeHeaders = [
            'accept-charset',
            'accept-encoding',
            'access-control-request-headers',
            'access-control-request-method',
            'connection',
            'content-length',
            'cookie',
            'cookie2',
            'date',
            'dnt',
            'expect',
            'host',
            'keep-alive',
            'origin',
            'referer',
            'te',
            'trailer',
            'transfer-encoding',
            'upgrade',
            'user-agent',
            'via'
        ]

    }).call(this,require('_process'),require("buffer").Buffer)
},{"./capability":36,"./response":38,"_process":16,"buffer":8,"foreach":40,"indexof":41,"inherits":14,"object-keys":42,"stream":34}],38:[function(require,module,exports){
    (function (process,Buffer){
        var capability = require('./capability')
        var foreach = require('foreach')
        var inherits = require('inherits')
        var stream = require('stream')

        var rStates = exports.readyStates = {
            UNSENT: 0,
            OPENED: 1,
            HEADERS_RECEIVED: 2,
            LOADING: 3,
            DONE: 4
        }

        var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode) {
            var self = this
            stream.Readable.call(self)

            self._mode = mode
            self.headers = {}
            self.rawHeaders = []
            self.trailers = {}
            self.rawTrailers = []

            // Fake the 'close' event, but only once 'end' fires
            self.on('end', function () {
                // The nextTick is necessary to prevent the 'request' module from causing an infinite loop
                process.nextTick(function () {
                    self.emit('close')
                })
            })

            if (mode === 'fetch') {
                self._fetchResponse = response

                self.statusCode = response.status
                self.statusMessage = response.statusText
                // backwards compatible version of for (<item> of <iterable>):
                // for (var <item>,_i,_it = <iterable>[Symbol.iterator](); <item> = (_i = _it.next()).value,!_i.done;)
                for (var header, _i, _it = response.headers[Symbol.iterator](); header = (_i = _it.next()).value, !_i.done;) {
                    self.headers[header[0].toLowerCase()] = header[1]
                    self.rawHeaders.push(header[0], header[1])
                }

                // TODO: this doesn't respect backpressure. Once WritableStream is available, this can be fixed
                var reader = response.body.getReader()
                function read () {
                    reader.read().then(function (result) {
                        if (self._destroyed)
                            return
                        if (result.done) {
                            self.push(null)
                            return
                        }
                        self.push(new Buffer(result.value))
                        read()
                    })
                }
                read()

            } else {
                self._xhr = xhr
                self._pos = 0

                self.statusCode = xhr.status
                self.statusMessage = xhr.statusText
                var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
                foreach(headers, function (header) {
                    var matches = header.match(/^([^:]+):\s*(.*)/)
                    if (matches) {
                        var key = matches[1].toLowerCase()
                        if (self.headers[key] !== undefined)
                            self.headers[key] += ', ' + matches[2]
                        else
                            self.headers[key] = matches[2]
                        self.rawHeaders.push(matches[1], matches[2])
                    }
                })

                self._charset = 'x-user-defined'
                if (!capability.overrideMimeType) {
                    var mimeType = self.rawHeaders['mime-type']
                    if (mimeType) {
                        var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
                        if (charsetMatch) {
                            self._charset = charsetMatch[1].toLowerCase()
                        }
                    }
                    if (!self._charset)
                        self._charset = 'utf-8' // best guess
                }
            }
        }

        inherits(IncomingMessage, stream.Readable)

        IncomingMessage.prototype._read = function () {}

        IncomingMessage.prototype._onXHRProgress = function () {
            var self = this

            var xhr = self._xhr

            var response = null
            switch (self._mode) {
                case 'text:vbarray': // For IE9
                    if (xhr.readyState !== rStates.DONE)
                        break
                    try {
                        // This fails in IE8
                        response = new window.VBArray(xhr.responseBody).toArray()
                    } catch (e) {}
                    if (response !== null) {
                        self.push(new Buffer(response))
                        break
                    }
                // Falls through in IE8	
                case 'text':
                    try { // This will fail when readyState = 3 in IE9. Switch mode and wait for readyState = 4
                        response = xhr.responseText
                    } catch (e) {
                        self._mode = 'text:vbarray'
                        break
                    }
                    if (response.length > self._pos) {
                        var newData = response.substr(self._pos)
                        if (self._charset === 'x-user-defined') {
                            var buffer = new Buffer(newData.length)
                            for (var i = 0; i < newData.length; i++)
                                buffer[i] = newData.charCodeAt(i) & 0xff

                            self.push(buffer)
                        } else {
                            self.push(newData, self._charset)
                        }
                        self._pos = response.length
                    }
                    break
                case 'arraybuffer':
                    if (xhr.readyState !== rStates.DONE)
                        break
                    response = xhr.response
                    self.push(new Buffer(new Uint8Array(response)))
                    break
                case 'moz-chunked-arraybuffer': // take whole
                    response = xhr.response
                    if (xhr.readyState !== rStates.LOADING || !response)
                        break
                    self.push(new Buffer(new Uint8Array(response)))
                    break
                case 'ms-stream':
                    response = xhr.response
                    if (xhr.readyState !== rStates.LOADING)
                        break
                    var reader = new window.MSStreamReader()
                    reader.onprogress = function () {
                        if (reader.result.byteLength > self._pos) {
                            self.push(new Buffer(new Uint8Array(reader.result.slice(self._pos))))
                            self._pos = reader.result.byteLength
                        }
                    }
                    reader.onload = function () {
                        self.push(null)
                    }
                    // reader.onerror = ??? // TODO: this
                    reader.readAsArrayBuffer(response)
                    break
            }

            // The ms-stream case handles end separately in reader.onload()
            if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
                self.push(null)
            }
        }

    }).call(this,require('_process'),require("buffer").Buffer)
},{"./capability":36,"_process":16,"buffer":8,"foreach":40,"inherits":14,"stream":34}],39:[function(require,module,exports){
    module.exports = {
        "100": "Continue",
        "101": "Switching Protocols",
        "102": "Processing",
        "200": "OK",
        "201": "Created",
        "202": "Accepted",
        "203": "Non-Authoritative Information",
        "204": "No Content",
        "205": "Reset Content",
        "206": "Partial Content",
        "207": "Multi-Status",
        "300": "Multiple Choices",
        "301": "Moved Permanently",
        "302": "Moved Temporarily",
        "303": "See Other",
        "304": "Not Modified",
        "305": "Use Proxy",
        "307": "Temporary Redirect",
        "308": "Permanent Redirect",
        "400": "Bad Request",
        "401": "Unauthorized",
        "402": "Payment Required",
        "403": "Forbidden",
        "404": "Not Found",
        "405": "Method Not Allowed",
        "406": "Not Acceptable",
        "407": "Proxy Authentication Required",
        "408": "Request Time-out",
        "409": "Conflict",
        "410": "Gone",
        "411": "Length Required",
        "412": "Precondition Failed",
        "413": "Request Entity Too Large",
        "414": "Request-URI Too Large",
        "415": "Unsupported Media Type",
        "416": "Requested Range Not Satisfiable",
        "417": "Expectation Failed",
        "418": "I'm a teapot",
        "422": "Unprocessable Entity",
        "423": "Locked",
        "424": "Failed Dependency",
        "425": "Unordered Collection",
        "426": "Upgrade Required",
        "428": "Precondition Required",
        "429": "Too Many Requests",
        "431": "Request Header Fields Too Large",
        "500": "Internal Server Error",
        "501": "Not Implemented",
        "502": "Bad Gateway",
        "503": "Service Unavailable",
        "504": "Gateway Time-out",
        "505": "HTTP Version Not Supported",
        "506": "Variant Also Negotiates",
        "507": "Insufficient Storage",
        "509": "Bandwidth Limit Exceeded",
        "510": "Not Extended",
        "511": "Network Authentication Required"
    }

},{}],40:[function(require,module,exports){

    var hasOwn = Object.prototype.hasOwnProperty;
    var toString = Object.prototype.toString;

    module.exports = function forEach (obj, fn, ctx) {
        if (toString.call(fn) !== '[object Function]') {
            throw new TypeError('iterator must be a function');
        }
        var l = obj.length;
        if (l === +l) {
            for (var i = 0; i < l; i++) {
                fn.call(ctx, obj[i], i, obj);
            }
        } else {
            for (var k in obj) {
                if (hasOwn.call(obj, k)) {
                    fn.call(ctx, obj[k], k, obj);
                }
            }
        }
    };


},{}],41:[function(require,module,exports){

    var indexOf = [].indexOf;

    module.exports = function(arr, obj){
        if (indexOf) return arr.indexOf(obj);
        for (var i = 0; i < arr.length; ++i) {
            if (arr[i] === obj) return i;
        }
        return -1;
    };
},{}],42:[function(require,module,exports){
    'use strict';

// modified from https://github.com/es-shims/es5-shim
    var has = Object.prototype.hasOwnProperty;
    var toStr = Object.prototype.toString;
    var slice = Array.prototype.slice;
    var isArgs = require('./isArguments');
    var hasDontEnumBug = !({ 'toString': null }).propertyIsEnumerable('toString');
    var hasProtoEnumBug = function () {}.propertyIsEnumerable('prototype');
    var dontEnums = [
        'toString',
        'toLocaleString',
        'valueOf',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'constructor'
    ];

    var keysShim = function keys(object) {
        var isObject = object !== null && typeof object === 'object';
        var isFunction = toStr.call(object) === '[object Function]';
        var isArguments = isArgs(object);
        var isString = isObject && toStr.call(object) === '[object String]';
        var theKeys = [];

        if (!isObject && !isFunction && !isArguments) {
            throw new TypeError('Object.keys called on a non-object');
        }

        var skipProto = hasProtoEnumBug && isFunction;
        if (isString && object.length > 0 && !has.call(object, 0)) {
            for (var i = 0; i < object.length; ++i) {
                theKeys.push(String(i));
            }
        }

        if (isArguments && object.length > 0) {
            for (var j = 0; j < object.length; ++j) {
                theKeys.push(String(j));
            }
        } else {
            for (var name in object) {
                if (!(skipProto && name === 'prototype') && has.call(object, name)) {
                    theKeys.push(String(name));
                }
            }
        }

        if (hasDontEnumBug) {
            var ctor = object.constructor;
            var skipConstructor = ctor && ctor.prototype === object;

            for (var k = 0; k < dontEnums.length; ++k) {
                if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
                    theKeys.push(dontEnums[k]);
                }
            }
        }
        return theKeys;
    };

    keysShim.shim = function shimObjectKeys() {
        if (!Object.keys) {
            Object.keys = keysShim;
        } else {
            var keysWorksWithArguments = (function () {
                // Safari 5.0 bug
                return (Object.keys(arguments) || '').length === 2;
            }(1, 2));
            if (!keysWorksWithArguments) {
                var originalKeys = Object.keys;
                Object.keys = function keys(object) {
                    if (isArgs(object)) {
                        return originalKeys(slice.call(object));
                    } else {
                        return originalKeys(object);
                    }
                };
            }
        }
        return Object.keys || keysShim;
    };

    module.exports = keysShim;

},{"./isArguments":43}],43:[function(require,module,exports){
    'use strict';

    var toStr = Object.prototype.toString;

    module.exports = function isArguments(value) {
        var str = toStr.call(value);
        var isArgs = str === '[object Arguments]';
        if (!isArgs) {
            isArgs = str !== '[object Array]' &&
                value !== null &&
                typeof value === 'object' &&
                typeof value.length === 'number' &&
                value.length >= 0 &&
                toStr.call(value.callee) === '[object Function]';
        }
        return isArgs;
    };

},{}],44:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

    var Buffer = require('buffer').Buffer;

    var isBufferEncoding = Buffer.isEncoding
        || function(encoding) {
            switch (encoding && encoding.toLowerCase()) {
                case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
                default: return false;
            }
        }


    function assertEncoding(encoding) {
        if (encoding && !isBufferEncoding(encoding)) {
            throw new Error('Unknown encoding: ' + encoding);
        }
    }

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
    var StringDecoder = exports.StringDecoder = function(encoding) {
        this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
        assertEncoding(encoding);
        switch (this.encoding) {
            case 'utf8':
                // CESU-8 represents each of Surrogate Pair by 3-bytes
                this.surrogateSize = 3;
                break;
            case 'ucs2':
            case 'utf16le':
                // UTF-16 represents each of Surrogate Pair by 2-bytes
                this.surrogateSize = 2;
                this.detectIncompleteChar = utf16DetectIncompleteChar;
                break;
            case 'base64':
                // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
                this.surrogateSize = 3;
                this.detectIncompleteChar = base64DetectIncompleteChar;
                break;
            default:
                this.write = passThroughWrite;
                return;
        }

        // Enough space to store all bytes of a single character. UTF-8 needs 4
        // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
        this.charBuffer = new Buffer(6);
        // Number of bytes received for the current incomplete multi-byte character.
        this.charReceived = 0;
        // Number of bytes expected for the current incomplete multi-byte character.
        this.charLength = 0;
    };


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
    StringDecoder.prototype.write = function(buffer) {
        var charStr = '';
        // if our last write ended with an incomplete multibyte character
        while (this.charLength) {
            // determine how many remaining bytes this buffer has to offer for this char
            var available = (buffer.length >= this.charLength - this.charReceived) ?
            this.charLength - this.charReceived :
                buffer.length;

            // add the new bytes to the char buffer
            buffer.copy(this.charBuffer, this.charReceived, 0, available);
            this.charReceived += available;

            if (this.charReceived < this.charLength) {
                // still not enough chars in this buffer? wait for more ...
                return '';
            }

            // remove bytes belonging to the current character from the buffer
            buffer = buffer.slice(available, buffer.length);

            // get the character that was split
            charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

            // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
            var charCode = charStr.charCodeAt(charStr.length - 1);
            if (charCode >= 0xD800 && charCode <= 0xDBFF) {
                this.charLength += this.surrogateSize;
                charStr = '';
                continue;
            }
            this.charReceived = this.charLength = 0;

            // if there are no more bytes in this buffer, just emit our char
            if (buffer.length === 0) {
                return charStr;
            }
            break;
        }

        // determine and set charLength / charReceived
        this.detectIncompleteChar(buffer);

        var end = buffer.length;
        if (this.charLength) {
            // buffer the incomplete character bytes we got
            buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
            end -= this.charReceived;
        }

        charStr += buffer.toString(this.encoding, 0, end);

        var end = charStr.length - 1;
        var charCode = charStr.charCodeAt(end);
        // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
        if (charCode >= 0xD800 && charCode <= 0xDBFF) {
            var size = this.surrogateSize;
            this.charLength += size;
            this.charReceived += size;
            this.charBuffer.copy(this.charBuffer, size, 0, size);
            buffer.copy(this.charBuffer, 0, 0, size);
            return charStr.substring(0, end);
        }

        // or just emit the charStr
        return charStr;
    };

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
    StringDecoder.prototype.detectIncompleteChar = function(buffer) {
        // determine how many bytes we have to check at the end of this buffer
        var i = (buffer.length >= 3) ? 3 : buffer.length;

        // Figure out if one of the last i bytes of our buffer announces an
        // incomplete char.
        for (; i > 0; i--) {
            var c = buffer[buffer.length - i];

            // See http://en.wikipedia.org/wiki/UTF-8#Description

            // 110XXXXX
            if (i == 1 && c >> 5 == 0x06) {
                this.charLength = 2;
                break;
            }

            // 1110XXXX
            if (i <= 2 && c >> 4 == 0x0E) {
                this.charLength = 3;
                break;
            }

            // 11110XXX
            if (i <= 3 && c >> 3 == 0x1E) {
                this.charLength = 4;
                break;
            }
        }
        this.charReceived = i;
    };

    StringDecoder.prototype.end = function(buffer) {
        var res = '';
        if (buffer && buffer.length)
            res = this.write(buffer);

        if (this.charReceived) {
            var cr = this.charReceived;
            var buf = this.charBuffer;
            var enc = this.encoding;
            res += buf.slice(0, cr).toString(enc);
        }

        return res;
    };

    function passThroughWrite(buffer) {
        return buffer.toString(this.encoding);
    }

    function utf16DetectIncompleteChar(buffer) {
        this.charReceived = buffer.length % 2;
        this.charLength = this.charReceived ? 2 : 0;
    }

    function base64DetectIncompleteChar(buffer) {
        this.charReceived = buffer.length % 3;
        this.charLength = this.charReceived ? 3 : 0;
    }

},{"buffer":8}],45:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

    var punycode = require('punycode');

    exports.parse = urlParse;
    exports.resolve = urlResolve;
    exports.resolveObject = urlResolveObject;
    exports.format = urlFormat;

    exports.Url = Url;

    function Url() {
        this.protocol = null;
        this.slashes = null;
        this.auth = null;
        this.host = null;
        this.port = null;
        this.hostname = null;
        this.hash = null;
        this.search = null;
        this.query = null;
        this.pathname = null;
        this.path = null;
        this.href = null;
    }

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
    var protocolPattern = /^([a-z0-9.+-]+:)/i,
        portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
        delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
        unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
        autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
        nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
        hostEndingChars = ['/', '?', '#'],
        hostnameMaxLen = 255,
        hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
        hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
        unsafeProtocol = {
            'javascript': true,
            'javascript:': true
        },
    // protocols that never have a hostname.
        hostlessProtocol = {
            'javascript': true,
            'javascript:': true
        },
    // protocols that always contain a // bit.
        slashedProtocol = {
            'http': true,
            'https': true,
            'ftp': true,
            'gopher': true,
            'file': true,
            'http:': true,
            'https:': true,
            'ftp:': true,
            'gopher:': true,
            'file:': true
        },
        querystring = require('querystring');

    function urlParse(url, parseQueryString, slashesDenoteHost) {
        if (url && isObject(url) && url instanceof Url) return url;

        var u = new Url;
        u.parse(url, parseQueryString, slashesDenoteHost);
        return u;
    }

    Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
        if (!isString(url)) {
            throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
        }

        var rest = url;

        // trim before proceeding.
        // This is to support parse stuff like "  http://foo.com  \n"
        rest = rest.trim();

        var proto = protocolPattern.exec(rest);
        if (proto) {
            proto = proto[0];
            var lowerProto = proto.toLowerCase();
            this.protocol = lowerProto;
            rest = rest.substr(proto.length);
        }

        // figure out if it's got a host
        // user@server is *always* interpreted as a hostname, and url
        // resolution will treat //foo/bar as host=foo,path=bar because that's
        // how the browser resolves relative URLs.
        if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
            var slashes = rest.substr(0, 2) === '//';
            if (slashes && !(proto && hostlessProtocol[proto])) {
                rest = rest.substr(2);
                this.slashes = true;
            }
        }

        if (!hostlessProtocol[proto] &&
            (slashes || (proto && !slashedProtocol[proto]))) {

            // there's a hostname.
            // the first instance of /, ?, ;, or # ends the host.
            //
            // If there is an @ in the hostname, then non-host chars *are* allowed
            // to the left of the last @ sign, unless some host-ending character
            // comes *before* the @-sign.
            // URLs are obnoxious.
            //
            // ex:
            // http://a@b@c/ => user:a@b host:c
            // http://a@b?@c => user:a host:c path:/?@c

            // v0.12 TODO(isaacs): This is not quite how Chrome does things.
            // Review our test case against browsers more comprehensively.

            // find the first instance of any hostEndingChars
            var hostEnd = -1;
            for (var i = 0; i < hostEndingChars.length; i++) {
                var hec = rest.indexOf(hostEndingChars[i]);
                if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
                    hostEnd = hec;
            }

            // at this point, either we have an explicit point where the
            // auth portion cannot go past, or the last @ char is the decider.
            var auth, atSign;
            if (hostEnd === -1) {
                // atSign can be anywhere.
                atSign = rest.lastIndexOf('@');
            } else {
                // atSign must be in auth portion.
                // http://a@b/c@d => host:b auth:a path:/c@d
                atSign = rest.lastIndexOf('@', hostEnd);
            }

            // Now we have a portion which is definitely the auth.
            // Pull that off.
            if (atSign !== -1) {
                auth = rest.slice(0, atSign);
                rest = rest.slice(atSign + 1);
                this.auth = decodeURIComponent(auth);
            }

            // the host is the remaining to the left of the first non-host char
            hostEnd = -1;
            for (var i = 0; i < nonHostChars.length; i++) {
                var hec = rest.indexOf(nonHostChars[i]);
                if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
                    hostEnd = hec;
            }
            // if we still have not hit it, then the entire thing is a host.
            if (hostEnd === -1)
                hostEnd = rest.length;

            this.host = rest.slice(0, hostEnd);
            rest = rest.slice(hostEnd);

            // pull out port.
            this.parseHost();

            // we've indicated that there is a hostname,
            // so even if it's empty, it has to be present.
            this.hostname = this.hostname || '';

            // if hostname begins with [ and ends with ]
            // assume that it's an IPv6 address.
            var ipv6Hostname = this.hostname[0] === '[' &&
                this.hostname[this.hostname.length - 1] === ']';

            // validate a little.
            if (!ipv6Hostname) {
                var hostparts = this.hostname.split(/\./);
                for (var i = 0, l = hostparts.length; i < l; i++) {
                    var part = hostparts[i];
                    if (!part) continue;
                    if (!part.match(hostnamePartPattern)) {
                        var newpart = '';
                        for (var j = 0, k = part.length; j < k; j++) {
                            if (part.charCodeAt(j) > 127) {
                                // we replace non-ASCII char with a temporary placeholder
                                // we need this to make sure size of hostname is not
                                // broken by replacing non-ASCII by nothing
                                newpart += 'x';
                            } else {
                                newpart += part[j];
                            }
                        }
                        // we test again with ASCII char only
                        if (!newpart.match(hostnamePartPattern)) {
                            var validParts = hostparts.slice(0, i);
                            var notHost = hostparts.slice(i + 1);
                            var bit = part.match(hostnamePartStart);
                            if (bit) {
                                validParts.push(bit[1]);
                                notHost.unshift(bit[2]);
                            }
                            if (notHost.length) {
                                rest = '/' + notHost.join('.') + rest;
                            }
                            this.hostname = validParts.join('.');
                            break;
                        }
                    }
                }
            }

            if (this.hostname.length > hostnameMaxLen) {
                this.hostname = '';
            } else {
                // hostnames are always lower case.
                this.hostname = this.hostname.toLowerCase();
            }

            if (!ipv6Hostname) {
                // IDNA Support: Returns a puny coded representation of "domain".
                // It only converts the part of the domain name that
                // has non ASCII characters. I.e. it dosent matter if
                // you call it with a domain that already is in ASCII.
                var domainArray = this.hostname.split('.');
                var newOut = [];
                for (var i = 0; i < domainArray.length; ++i) {
                    var s = domainArray[i];
                    newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
                    'xn--' + punycode.encode(s) : s);
                }
                this.hostname = newOut.join('.');
            }

            var p = this.port ? ':' + this.port : '';
            var h = this.hostname || '';
            this.host = h + p;
            this.href += this.host;

            // strip [ and ] from the hostname
            // the host field still retains them, though
            if (ipv6Hostname) {
                this.hostname = this.hostname.substr(1, this.hostname.length - 2);
                if (rest[0] !== '/') {
                    rest = '/' + rest;
                }
            }
        }

        // now rest is set to the post-host stuff.
        // chop off any delim chars.
        if (!unsafeProtocol[lowerProto]) {

            // First, make 100% sure that any "autoEscape" chars get
            // escaped, even if encodeURIComponent doesn't think they
            // need to be.
            for (var i = 0, l = autoEscape.length; i < l; i++) {
                var ae = autoEscape[i];
                var esc = encodeURIComponent(ae);
                if (esc === ae) {
                    esc = escape(ae);
                }
                rest = rest.split(ae).join(esc);
            }
        }


        // chop off from the tail first.
        var hash = rest.indexOf('#');
        if (hash !== -1) {
            // got a fragment string.
            this.hash = rest.substr(hash);
            rest = rest.slice(0, hash);
        }
        var qm = rest.indexOf('?');
        if (qm !== -1) {
            this.search = rest.substr(qm);
            this.query = rest.substr(qm + 1);
            if (parseQueryString) {
                this.query = querystring.parse(this.query);
            }
            rest = rest.slice(0, qm);
        } else if (parseQueryString) {
            // no query string, but parseQueryString still requested
            this.search = '';
            this.query = {};
        }
        if (rest) this.pathname = rest;
        if (slashedProtocol[lowerProto] &&
            this.hostname && !this.pathname) {
            this.pathname = '/';
        }

        //to support http.request
        if (this.pathname || this.search) {
            var p = this.pathname || '';
            var s = this.search || '';
            this.path = p + s;
        }

        // finally, reconstruct the href based on what has been validated.
        this.href = this.format();
        return this;
    };

// format a parsed object into a url string
    function urlFormat(obj) {
        // ensure it's an object, and not a string url.
        // If it's an obj, this is a no-op.
        // this way, you can call url_format() on strings
        // to clean up potentially wonky urls.
        if (isString(obj)) obj = urlParse(obj);
        if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
        return obj.format();
    }

    Url.prototype.format = function() {
        var auth = this.auth || '';
        if (auth) {
            auth = encodeURIComponent(auth);
            auth = auth.replace(/%3A/i, ':');
            auth += '@';
        }

        var protocol = this.protocol || '',
            pathname = this.pathname || '',
            hash = this.hash || '',
            host = false,
            query = '';

        if (this.host) {
            host = auth + this.host;
        } else if (this.hostname) {
            host = auth + (this.hostname.indexOf(':') === -1 ?
                    this.hostname :
                '[' + this.hostname + ']');
            if (this.port) {
                host += ':' + this.port;
            }
        }

        if (this.query &&
            isObject(this.query) &&
            Object.keys(this.query).length) {
            query = querystring.stringify(this.query);
        }

        var search = this.search || (query && ('?' + query)) || '';

        if (protocol && protocol.substr(-1) !== ':') protocol += ':';

        // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
        // unless they had them to begin with.
        if (this.slashes ||
            (!protocol || slashedProtocol[protocol]) && host !== false) {
            host = '//' + (host || '');
            if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
        } else if (!host) {
            host = '';
        }

        if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
        if (search && search.charAt(0) !== '?') search = '?' + search;

        pathname = pathname.replace(/[?#]/g, function(match) {
            return encodeURIComponent(match);
        });
        search = search.replace('#', '%23');

        return protocol + host + pathname + search + hash;
    };

    function urlResolve(source, relative) {
        return urlParse(source, false, true).resolve(relative);
    }

    Url.prototype.resolve = function(relative) {
        return this.resolveObject(urlParse(relative, false, true)).format();
    };

    function urlResolveObject(source, relative) {
        if (!source) return relative;
        return urlParse(source, false, true).resolveObject(relative);
    }

    Url.prototype.resolveObject = function(relative) {
        if (isString(relative)) {
            var rel = new Url();
            rel.parse(relative, false, true);
            relative = rel;
        }

        var result = new Url();
        Object.keys(this).forEach(function(k) {
            result[k] = this[k];
        }, this);

        // hash is always overridden, no matter what.
        // even href="" will remove it.
        result.hash = relative.hash;

        // if the relative url is empty, then there's nothing left to do here.
        if (relative.href === '') {
            result.href = result.format();
            return result;
        }

        // hrefs like //foo/bar always cut to the protocol.
        if (relative.slashes && !relative.protocol) {
            // take everything except the protocol from relative
            Object.keys(relative).forEach(function(k) {
                if (k !== 'protocol')
                    result[k] = relative[k];
            });

            //urlParse appends trailing / to urls like http://www.example.com
            if (slashedProtocol[result.protocol] &&
                result.hostname && !result.pathname) {
                result.path = result.pathname = '/';
            }

            result.href = result.format();
            return result;
        }

        if (relative.protocol && relative.protocol !== result.protocol) {
            // if it's a known url protocol, then changing
            // the protocol does weird things
            // first, if it's not file:, then we MUST have a host,
            // and if there was a path
            // to begin with, then we MUST have a path.
            // if it is file:, then the host is dropped,
            // because that's known to be hostless.
            // anything else is assumed to be absolute.
            if (!slashedProtocol[relative.protocol]) {
                Object.keys(relative).forEach(function(k) {
                    result[k] = relative[k];
                });
                result.href = result.format();
                return result;
            }

            result.protocol = relative.protocol;
            if (!relative.host && !hostlessProtocol[relative.protocol]) {
                var relPath = (relative.pathname || '').split('/');
                while (relPath.length && !(relative.host = relPath.shift()));
                if (!relative.host) relative.host = '';
                if (!relative.hostname) relative.hostname = '';
                if (relPath[0] !== '') relPath.unshift('');
                if (relPath.length < 2) relPath.unshift('');
                result.pathname = relPath.join('/');
            } else {
                result.pathname = relative.pathname;
            }
            result.search = relative.search;
            result.query = relative.query;
            result.host = relative.host || '';
            result.auth = relative.auth;
            result.hostname = relative.hostname || relative.host;
            result.port = relative.port;
            // to support http.request
            if (result.pathname || result.search) {
                var p = result.pathname || '';
                var s = result.search || '';
                result.path = p + s;
            }
            result.slashes = result.slashes || relative.slashes;
            result.href = result.format();
            return result;
        }

        var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
            isRelAbs = (
                relative.host ||
                relative.pathname && relative.pathname.charAt(0) === '/'
            ),
            mustEndAbs = (isRelAbs || isSourceAbs ||
            (result.host && relative.pathname)),
            removeAllDots = mustEndAbs,
            srcPath = result.pathname && result.pathname.split('/') || [],
            relPath = relative.pathname && relative.pathname.split('/') || [],
            psychotic = result.protocol && !slashedProtocol[result.protocol];

        // if the url is a non-slashed url, then relative
        // links like ../.. should be able
        // to crawl up to the hostname, as well.  This is strange.
        // result.protocol has already been set by now.
        // Later on, put the first path part into the host field.
        if (psychotic) {
            result.hostname = '';
            result.port = null;
            if (result.host) {
                if (srcPath[0] === '') srcPath[0] = result.host;
                else srcPath.unshift(result.host);
            }
            result.host = '';
            if (relative.protocol) {
                relative.hostname = null;
                relative.port = null;
                if (relative.host) {
                    if (relPath[0] === '') relPath[0] = relative.host;
                    else relPath.unshift(relative.host);
                }
                relative.host = null;
            }
            mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
        }

        if (isRelAbs) {
            // it's absolute.
            result.host = (relative.host || relative.host === '') ?
                relative.host : result.host;
            result.hostname = (relative.hostname || relative.hostname === '') ?
                relative.hostname : result.hostname;
            result.search = relative.search;
            result.query = relative.query;
            srcPath = relPath;
            // fall through to the dot-handling below.
        } else if (relPath.length) {
            // it's relative
            // throw away the existing file, and take the new path instead.
            if (!srcPath) srcPath = [];
            srcPath.pop();
            srcPath = srcPath.concat(relPath);
            result.search = relative.search;
            result.query = relative.query;
        } else if (!isNullOrUndefined(relative.search)) {
            // just pull out the search.
            // like href='?foo'.
            // Put this after the other two cases because it simplifies the booleans
            if (psychotic) {
                result.hostname = result.host = srcPath.shift();
                //occationaly the auth can get stuck only in host
                //this especialy happens in cases like
                //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
                var authInHost = result.host && result.host.indexOf('@') > 0 ?
                    result.host.split('@') : false;
                if (authInHost) {
                    result.auth = authInHost.shift();
                    result.host = result.hostname = authInHost.shift();
                }
            }
            result.search = relative.search;
            result.query = relative.query;
            //to support http.request
            if (!isNull(result.pathname) || !isNull(result.search)) {
                result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
            }
            result.href = result.format();
            return result;
        }

        if (!srcPath.length) {
            // no path at all.  easy.
            // we've already handled the other stuff above.
            result.pathname = null;
            //to support http.request
            if (result.search) {
                result.path = '/' + result.search;
            } else {
                result.path = null;
            }
            result.href = result.format();
            return result;
        }

        // if a url ENDs in . or .., then it must get a trailing slash.
        // however, if it ends in anything else non-slashy,
        // then it must NOT get a trailing slash.
        var last = srcPath.slice(-1)[0];
        var hasTrailingSlash = (
        (result.host || relative.host) && (last === '.' || last === '..') ||
        last === '');

        // strip single dots, resolve double dots to parent dir
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = srcPath.length; i >= 0; i--) {
            last = srcPath[i];
            if (last == '.') {
                srcPath.splice(i, 1);
            } else if (last === '..') {
                srcPath.splice(i, 1);
                up++;
            } else if (up) {
                srcPath.splice(i, 1);
                up--;
            }
        }

        // if the path is allowed to go above the root, restore leading ..s
        if (!mustEndAbs && !removeAllDots) {
            for (; up--; up) {
                srcPath.unshift('..');
            }
        }

        if (mustEndAbs && srcPath[0] !== '' &&
            (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
            srcPath.unshift('');
        }

        if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
            srcPath.push('');
        }

        var isAbsolute = srcPath[0] === '' ||
            (srcPath[0] && srcPath[0].charAt(0) === '/');

        // put the host back
        if (psychotic) {
            result.hostname = result.host = isAbsolute ? '' :
                srcPath.length ? srcPath.shift() : '';
            //occationaly the auth can get stuck only in host
            //this especialy happens in cases like
            //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
            var authInHost = result.host && result.host.indexOf('@') > 0 ?
                result.host.split('@') : false;
            if (authInHost) {
                result.auth = authInHost.shift();
                result.host = result.hostname = authInHost.shift();
            }
        }

        mustEndAbs = mustEndAbs || (result.host && srcPath.length);

        if (mustEndAbs && !isAbsolute) {
            srcPath.unshift('');
        }

        if (!srcPath.length) {
            result.pathname = null;
            result.path = null;
        } else {
            result.pathname = srcPath.join('/');
        }

        //to support request.http
        if (!isNull(result.pathname) || !isNull(result.search)) {
            result.path = (result.pathname ? result.pathname : '') +
                (result.search ? result.search : '');
        }
        result.auth = relative.auth || result.auth;
        result.slashes = result.slashes || relative.slashes;
        result.href = result.format();
        return result;
    };

    Url.prototype.parseHost = function() {
        var host = this.host;
        var port = portPattern.exec(host);
        if (port) {
            port = port[0];
            if (port !== ':') {
                this.port = port.substr(1);
            }
            host = host.substr(0, host.length - port.length);
        }
        if (host) this.hostname = host;
    };

    function isString(arg) {
        return typeof arg === "string";
    }

    function isObject(arg) {
        return typeof arg === 'object' && arg !== null;
    }

    function isNull(arg) {
        return arg === null;
    }
    function isNullOrUndefined(arg) {
        return  arg == null;
    }

},{"punycode":17,"querystring":20}],46:[function(require,module,exports){
    module.exports = function isBuffer(arg) {
        return arg && typeof arg === 'object'
            && typeof arg.copy === 'function'
            && typeof arg.fill === 'function'
            && typeof arg.readUInt8 === 'function';
    }
},{}],47:[function(require,module,exports){
    (function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

        var formatRegExp = /%[sdj%]/g;
        exports.format = function(f) {
            if (!isString(f)) {
                var objects = [];
                for (var i = 0; i < arguments.length; i++) {
                    objects.push(inspect(arguments[i]));
                }
                return objects.join(' ');
            }

            var i = 1;
            var args = arguments;
            var len = args.length;
            var str = String(f).replace(formatRegExp, function(x) {
                if (x === '%%') return '%';
                if (i >= len) return x;
                switch (x) {
                    case '%s': return String(args[i++]);
                    case '%d': return Number(args[i++]);
                    case '%j':
                        try {
                            return JSON.stringify(args[i++]);
                        } catch (_) {
                            return '[Circular]';
                        }
                    default:
                        return x;
                }
            });
            for (var x = args[i]; i < len; x = args[++i]) {
                if (isNull(x) || !isObject(x)) {
                    str += ' ' + x;
                } else {
                    str += ' ' + inspect(x);
                }
            }
            return str;
        };


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
        exports.deprecate = function(fn, msg) {
            // Allow for deprecating things in the process of starting up.
            if (isUndefined(global.process)) {
                return function() {
                    return exports.deprecate(fn, msg).apply(this, arguments);
                };
            }

            if (process.noDeprecation === true) {
                return fn;
            }

            var warned = false;
            function deprecated() {
                if (!warned) {
                    if (process.throwDeprecation) {
                        throw new Error(msg);
                    } else if (process.traceDeprecation) {
                        console.trace(msg);
                    } else {
                        console.error(msg);
                    }
                    warned = true;
                }
                return fn.apply(this, arguments);
            }

            return deprecated;
        };


        var debugs = {};
        var debugEnviron;
        exports.debuglog = function(set) {
            if (isUndefined(debugEnviron))
                debugEnviron = process.env.NODE_DEBUG || '';
            set = set.toUpperCase();
            if (!debugs[set]) {
                if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
                    var pid = process.pid;
                    debugs[set] = function() {
                        var msg = exports.format.apply(exports, arguments);
                        console.error('%s %d: %s', set, pid, msg);
                    };
                } else {
                    debugs[set] = function() {};
                }
            }
            return debugs[set];
        };


        /**
         * Echos the value of a value. Trys to print the value out
         * in the best way possible given the different types.
         *
         * @param {Object} obj The object to print out.
         * @param {Object} opts Optional options object that alters the output.
         */
        /* legacy: obj, showHidden, depth, colors*/
        function inspect(obj, opts) {
            // default options
            var ctx = {
                seen: [],
                stylize: stylizeNoColor
            };
            // legacy...
            if (arguments.length >= 3) ctx.depth = arguments[2];
            if (arguments.length >= 4) ctx.colors = arguments[3];
            if (isBoolean(opts)) {
                // legacy...
                ctx.showHidden = opts;
            } else if (opts) {
                // got an "options" object
                exports._extend(ctx, opts);
            }
            // set default options
            if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
            if (isUndefined(ctx.depth)) ctx.depth = 2;
            if (isUndefined(ctx.colors)) ctx.colors = false;
            if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
            if (ctx.colors) ctx.stylize = stylizeWithColor;
            return formatValue(ctx, obj, ctx.depth);
        }
        exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
        inspect.colors = {
            'bold' : [1, 22],
            'italic' : [3, 23],
            'underline' : [4, 24],
            'inverse' : [7, 27],
            'white' : [37, 39],
            'grey' : [90, 39],
            'black' : [30, 39],
            'blue' : [34, 39],
            'cyan' : [36, 39],
            'green' : [32, 39],
            'magenta' : [35, 39],
            'red' : [31, 39],
            'yellow' : [33, 39]
        };

// Don't use 'blue' not visible on cmd.exe
        inspect.styles = {
            'special': 'cyan',
            'number': 'yellow',
            'boolean': 'yellow',
            'undefined': 'grey',
            'null': 'bold',
            'string': 'green',
            'date': 'magenta',
            // "name": intentionally not styling
            'regexp': 'red'
        };


        function stylizeWithColor(str, styleType) {
            var style = inspect.styles[styleType];

            if (style) {
                return '\u001b[' + inspect.colors[style][0] + 'm' + str +
                    '\u001b[' + inspect.colors[style][1] + 'm';
            } else {
                return str;
            }
        }


        function stylizeNoColor(str, styleType) {
            return str;
        }


        function arrayToHash(array) {
            var hash = {};

            array.forEach(function(val, idx) {
                hash[val] = true;
            });

            return hash;
        }


        function formatValue(ctx, value, recurseTimes) {
            // Provide a hook for user-specified inspect functions.
            // Check that value is an object with an inspect function on it
            if (ctx.customInspect &&
                value &&
                isFunction(value.inspect) &&
                    // Filter out the util module, it's inspect function is special
                value.inspect !== exports.inspect &&
                    // Also filter out any prototype objects using the circular check.
                !(value.constructor && value.constructor.prototype === value)) {
                var ret = value.inspect(recurseTimes, ctx);
                if (!isString(ret)) {
                    ret = formatValue(ctx, ret, recurseTimes);
                }
                return ret;
            }

            // Primitive types cannot have properties
            var primitive = formatPrimitive(ctx, value);
            if (primitive) {
                return primitive;
            }

            // Look up the keys of the object.
            var keys = Object.keys(value);
            var visibleKeys = arrayToHash(keys);

            if (ctx.showHidden) {
                keys = Object.getOwnPropertyNames(value);
            }

            // IE doesn't make error fields non-enumerable
            // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
            if (isError(value)
                && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
                return formatError(value);
            }

            // Some type of object without properties can be shortcutted.
            if (keys.length === 0) {
                if (isFunction(value)) {
                    var name = value.name ? ': ' + value.name : '';
                    return ctx.stylize('[Function' + name + ']', 'special');
                }
                if (isRegExp(value)) {
                    return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
                }
                if (isDate(value)) {
                    return ctx.stylize(Date.prototype.toString.call(value), 'date');
                }
                if (isError(value)) {
                    return formatError(value);
                }
            }

            var base = '', array = false, braces = ['{', '}'];

            // Make Array say that they are Array
            if (isArray(value)) {
                array = true;
                braces = ['[', ']'];
            }

            // Make functions say that they are functions
            if (isFunction(value)) {
                var n = value.name ? ': ' + value.name : '';
                base = ' [Function' + n + ']';
            }

            // Make RegExps say that they are RegExps
            if (isRegExp(value)) {
                base = ' ' + RegExp.prototype.toString.call(value);
            }

            // Make dates with properties first say the date
            if (isDate(value)) {
                base = ' ' + Date.prototype.toUTCString.call(value);
            }

            // Make error with message first say the error
            if (isError(value)) {
                base = ' ' + formatError(value);
            }

            if (keys.length === 0 && (!array || value.length == 0)) {
                return braces[0] + base + braces[1];
            }

            if (recurseTimes < 0) {
                if (isRegExp(value)) {
                    return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
                } else {
                    return ctx.stylize('[Object]', 'special');
                }
            }

            ctx.seen.push(value);

            var output;
            if (array) {
                output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
            } else {
                output = keys.map(function(key) {
                    return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
                });
            }

            ctx.seen.pop();

            return reduceToSingleString(output, base, braces);
        }


        function formatPrimitive(ctx, value) {
            if (isUndefined(value))
                return ctx.stylize('undefined', 'undefined');
            if (isString(value)) {
                var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                        .replace(/'/g, "\\'")
                        .replace(/\\"/g, '"') + '\'';
                return ctx.stylize(simple, 'string');
            }
            if (isNumber(value))
                return ctx.stylize('' + value, 'number');
            if (isBoolean(value))
                return ctx.stylize('' + value, 'boolean');
            // For some reason typeof null is "object", so special case here.
            if (isNull(value))
                return ctx.stylize('null', 'null');
        }


        function formatError(value) {
            return '[' + Error.prototype.toString.call(value) + ']';
        }


        function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
            var output = [];
            for (var i = 0, l = value.length; i < l; ++i) {
                if (hasOwnProperty(value, String(i))) {
                    output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                        String(i), true));
                } else {
                    output.push('');
                }
            }
            keys.forEach(function(key) {
                if (!key.match(/^\d+$/)) {
                    output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
                        key, true));
                }
            });
            return output;
        }


        function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
            var name, str, desc;
            desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
            if (desc.get) {
                if (desc.set) {
                    str = ctx.stylize('[Getter/Setter]', 'special');
                } else {
                    str = ctx.stylize('[Getter]', 'special');
                }
            } else {
                if (desc.set) {
                    str = ctx.stylize('[Setter]', 'special');
                }
            }
            if (!hasOwnProperty(visibleKeys, key)) {
                name = '[' + key + ']';
            }
            if (!str) {
                if (ctx.seen.indexOf(desc.value) < 0) {
                    if (isNull(recurseTimes)) {
                        str = formatValue(ctx, desc.value, null);
                    } else {
                        str = formatValue(ctx, desc.value, recurseTimes - 1);
                    }
                    if (str.indexOf('\n') > -1) {
                        if (array) {
                            str = str.split('\n').map(function(line) {
                                return '  ' + line;
                            }).join('\n').substr(2);
                        } else {
                            str = '\n' + str.split('\n').map(function(line) {
                                    return '   ' + line;
                                }).join('\n');
                        }
                    }
                } else {
                    str = ctx.stylize('[Circular]', 'special');
                }
            }
            if (isUndefined(name)) {
                if (array && key.match(/^\d+$/)) {
                    return str;
                }
                name = JSON.stringify('' + key);
                if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
                    name = name.substr(1, name.length - 2);
                    name = ctx.stylize(name, 'name');
                } else {
                    name = name.replace(/'/g, "\\'")
                        .replace(/\\"/g, '"')
                        .replace(/(^"|"$)/g, "'");
                    name = ctx.stylize(name, 'string');
                }
            }

            return name + ': ' + str;
        }


        function reduceToSingleString(output, base, braces) {
            var numLinesEst = 0;
            var length = output.reduce(function(prev, cur) {
                numLinesEst++;
                if (cur.indexOf('\n') >= 0) numLinesEst++;
                return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
            }, 0);

            if (length > 60) {
                return braces[0] +
                    (base === '' ? '' : base + '\n ') +
                    ' ' +
                    output.join(',\n  ') +
                    ' ' +
                    braces[1];
            }

            return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
        }


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
        function isArray(ar) {
            return Array.isArray(ar);
        }
        exports.isArray = isArray;

        function isBoolean(arg) {
            return typeof arg === 'boolean';
        }
        exports.isBoolean = isBoolean;

        function isNull(arg) {
            return arg === null;
        }
        exports.isNull = isNull;

        function isNullOrUndefined(arg) {
            return arg == null;
        }
        exports.isNullOrUndefined = isNullOrUndefined;

        function isNumber(arg) {
            return typeof arg === 'number';
        }
        exports.isNumber = isNumber;

        function isString(arg) {
            return typeof arg === 'string';
        }
        exports.isString = isString;

        function isSymbol(arg) {
            return typeof arg === 'symbol';
        }
        exports.isSymbol = isSymbol;

        function isUndefined(arg) {
            return arg === void 0;
        }
        exports.isUndefined = isUndefined;

        function isRegExp(re) {
            return isObject(re) && objectToString(re) === '[object RegExp]';
        }
        exports.isRegExp = isRegExp;

        function isObject(arg) {
            return typeof arg === 'object' && arg !== null;
        }
        exports.isObject = isObject;

        function isDate(d) {
            return isObject(d) && objectToString(d) === '[object Date]';
        }
        exports.isDate = isDate;

        function isError(e) {
            return isObject(e) &&
                (objectToString(e) === '[object Error]' || e instanceof Error);
        }
        exports.isError = isError;

        function isFunction(arg) {
            return typeof arg === 'function';
        }
        exports.isFunction = isFunction;

        function isPrimitive(arg) {
            return arg === null ||
                typeof arg === 'boolean' ||
                typeof arg === 'number' ||
                typeof arg === 'string' ||
                typeof arg === 'symbol' ||  // ES6 symbol
                typeof arg === 'undefined';
        }
        exports.isPrimitive = isPrimitive;

        exports.isBuffer = require('./support/isBuffer');

        function objectToString(o) {
            return Object.prototype.toString.call(o);
        }


        function pad(n) {
            return n < 10 ? '0' + n.toString(10) : n.toString(10);
        }


        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
            'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
        function timestamp() {
            var d = new Date();
            var time = [pad(d.getHours()),
                pad(d.getMinutes()),
                pad(d.getSeconds())].join(':');
            return [d.getDate(), months[d.getMonth()], time].join(' ');
        }


// log is just a thin wrapper to console.log that prepends a timestamp
        exports.log = function() {
            console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
        };


        /**
         * Inherit the prototype methods from one constructor into another.
         *
         * The Function.prototype.inherits from lang.js rewritten as a standalone
         * function (not on Function.prototype). NOTE: If this file is to be loaded
         * during bootstrapping this function needs to be rewritten using some native
         * functions as prototype setup using normal JavaScript does not work as
         * expected during bootstrapping (see mirror.js in r114903).
         *
         * @param {function} ctor Constructor function which needs to inherit the
         *     prototype.
         * @param {function} superCtor Constructor function to inherit prototype from.
         */
        exports.inherits = require('inherits');

        exports._extend = function(origin, add) {
            // Don't do anything if add isn't an object
            if (!add || !isObject(add)) return origin;

            var keys = Object.keys(add);
            var i = keys.length;
            while (i--) {
                origin[keys[i]] = add[keys[i]];
            }
            return origin;
        };

        function hasOwnProperty(obj, prop) {
            return Object.prototype.hasOwnProperty.call(obj, prop);
        }

    }).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":46,"_process":16,"inherits":14}],48:[function(require,module,exports){
    module.exports = extend

    function extend() {
        var target = {}

        for (var i = 0; i < arguments.length; i++) {
            var source = arguments[i]

            for (var key in source) {
                if (source.hasOwnProperty(key)) {
                    target[key] = source[key]
                }
            }
        }

        return target
    }

},{}],49:[function(require,module,exports){
    /*
     * loglevel - https://github.com/pimterry/loglevel
     *
     * Copyright (c) 2013 Tim Perry
     * Licensed under the MIT license.
     */
    (function (root, definition) {
        if (typeof module === 'object' && module.exports && typeof require === 'function') {
            module.exports = definition();
        } else if (typeof define === 'function' && typeof define.amd === 'object') {
            define(definition);
        } else {
            root.log = definition();
        }
    }(this, function () {
        var self = {};
        var noop = function() {};
        var undefinedType = "undefined";

        function realMethod(methodName) {
            if (typeof console === undefinedType) {
                return false; // We can't build a real method without a console to log to
            } else if (console[methodName] !== undefined) {
                return bindMethod(console, methodName);
            } else if (console.log !== undefined) {
                return bindMethod(console, 'log');
            } else {
                return noop;
            }
        }

        function bindMethod(obj, methodName) {
            var method = obj[methodName];
            if (typeof method.bind === 'function') {
                return method.bind(obj);
            } else {
                try {
                    return Function.prototype.bind.call(method, obj);
                } catch (e) {
                    // Missing bind shim or IE8 + Modernizr, fallback to wrapping
                    return function() {
                        return Function.prototype.apply.apply(method, [obj, arguments]);
                    };
                }
            }
        }

        function enableLoggingWhenConsoleArrives(methodName, level) {
            return function () {
                if (typeof console !== undefinedType) {
                    replaceLoggingMethods(level);
                    self[methodName].apply(self, arguments);
                }
            };
        }

        var logMethods = [
            "trace",
            "debug",
            "info",
            "warn",
            "error"
        ];

        function replaceLoggingMethods(level) {
            for (var i = 0; i < logMethods.length; i++) {
                var methodName = logMethods[i];
                self[methodName] = (i < level) ? noop : self.methodFactory(methodName, level);
            }
        }

        function persistLevelIfPossible(levelNum) {
            var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

            // Use localStorage if available
            try {
                window.localStorage['loglevel'] = levelName;
                return;
            } catch (ignore) {}

            // Use session cookie as fallback
            try {
                window.document.cookie = "loglevel=" + levelName + ";";
            } catch (ignore) {}
        }

        function loadPersistedLevel() {
            var storedLevel;

            try {
                storedLevel = window.localStorage['loglevel'];
            } catch (ignore) {}

            if (typeof storedLevel === undefinedType) {
                try {
                    storedLevel = /loglevel=([^;]+)/.exec(window.document.cookie)[1];
                } catch (ignore) {}
            }

            if (self.levels[storedLevel] === undefined) {
                storedLevel = "WARN";
            }

            self.setLevel(self.levels[storedLevel], false);
        }

        /*
         *
         * Public API
         *
         */

        self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
            "ERROR": 4, "SILENT": 5};

        self.methodFactory = function (methodName, level) {
            return realMethod(methodName) ||
                enableLoggingWhenConsoleArrives(methodName, level);
        };

        self.setLevel = function (level, persist) {
            if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
                level = self.levels[level.toUpperCase()];
            }
            if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
                if (persist !== false) {  // defaults to true
                    persistLevelIfPossible(level);
                }
                replaceLoggingMethods(level);
                if (typeof console === undefinedType && level < self.levels.SILENT) {
                    return "No console available for logging";
                }
            } else {
                throw "log.setLevel() called with invalid level: " + level;
            }
        };

        self.enableAll = function(persist) {
            self.setLevel(self.levels.TRACE, persist);
        };

        self.disableAll = function(persist) {
            self.setLevel(self.levels.SILENT, persist);
        };

        // Grab the current global log variable in case of overwrite
        var _log = (typeof window !== undefinedType) ? window.log : undefined;
        self.noConflict = function() {
            if (typeof window !== undefinedType &&
                window.log === self) {
                window.log = _log;
            }

            return self;
        };

        loadPersistedLevel();
        return self;
    }));

},{}],50:[function(require,module,exports){
    'use strict';

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var request = require('../../util/request');
    var log = require('loglevel');

    var DataSyncConfig = require('./configuration.js');
    var Subscriptions  = require('./subscriptions.js');
    var CoreDataEntity = require('./dataentity.js');
    var EventStream    = require('./eventstream.js');
    var Router         = require('./router.js');
    var Network        = require('./network.js');

    var COREDATA_ENTITY_NOTIFICATION_TYPE = 'cdsObjectUpdate';
    var COREDATA_EVENTSTREAM_NOTIFICATION_TYPE = 'cdsStreamUpdate';

    /**
     * @param {String} token authorization token
     * @param {NotificationClient} notification initiated notification client instance
     *
     * @class DataSyncClient
     * @classdesc DataSync service client
     */
    function DataSyncClient(token, notification)
    {
        this._notification = notification;

        this._config = new DataSyncConfig(token);
        this._network = new Network(this._config);
        this._subscriptions = new Subscriptions(this._config);
        this._router  = new Router({config: this._config,
            subscriptions: this._subscriptions});

        notification.subscribe(COREDATA_ENTITY_NOTIFICATION_TYPE); // twilsock by default
        notification.subscribe(COREDATA_EVENTSTREAM_NOTIFICATION_TYPE); // twilsock by default

        notification.on('message', this._router.onMessage.bind(this._router));
        notification.on('transport_ready', function(state) {
            if(state) { this._router.onConnected(); }
        }.bind(this));
    }

    /**
     * Creates new data entity
     * {@see CoreDataEntity}
     * @returns Returns promise
     */
    DataSyncClient.prototype.createEntity = function(data, mergeConflicts, purpose)
    {
        var self = this;

        // We do not support user objects which contains _metadata property,
        // because we're using it for internal needs

        if(data.hasOwnProperty('_metadata'))
        {
            log.error("DSS E: user object can't have _metadata property");
            return Promise.reject("Bad user data");
        }

        data._metadata = { purpose: purpose };

        var requestParams = {
            url: this._config.getEntitiesUri(),
            headers: {
                'Content-Type': 'application/json',
                'X-Twilio-Token': this._config.getToken(),
            },
            body: data
        };

        var promise = new Promise(function(resolve, reject) {
            request('POST', requestParams)
                .then(function(res) {
                    log.debug("DSS I: entity created: " + res);

                    // It's better to get these values from header though, but fine for now
                    var response = JSON.parse(res);

                    var id = response._metadata.clientlocation;
                    var etag = response._metadata.revision;

                    var entity = new CoreDataEntity({
                            config: self._config,
                            datasync: self,
                            network: self._network,
                            router:  self._router,
                        },
                        id, etag, response._metadata);

                    delete data._metadata;
                    entity._data = data;

                    self._router.addEntity(entity);

                    resolve(entity);

                }, function(reason) {
                    log.error("DSS E: failed to create entity: " + reason);
                    reject(reason);
                });
        });

        return promise;
    };

    /**
     * Open exisiting data entity
     * {@see CoreDataEntity}
     */
    DataSyncClient.prototype.openEntity = function(uri)
    {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self._network.getEntity(uri)
                .then(function(response) {

                    var etag = response.headers.ETag;
                    var entity = new CoreDataEntity({
                            config: self._config,
                            datasync: self,
                            network: self._network,
                            router:  self._router,
                        },
                        uri, etag);

                    entity._data = response.body;

                    self._router.addEntity(entity);
                    resolve(entity);

                }, function(reason) {
                    log.error("DSS E: Can't open entity: " + reason);
                    reject(reason);
                });
        });

        return promise;
    };

    /**
     *  Creates the new Event Stream.
     *  @param {string} purpose - the purpose of created object
     *  @return Returns the promise which might fail
     */
    DataSyncClient.prototype.createEventStream = function(purpose)
    {
        var data = {
            _metadata: {
                purpose: purpose
            }
        };

        var requestParams = {
            url: this._config.getStreamsUri(),
            headers: {
                'Content-Type': 'application/json',
                'X-Twilio-Token': this._config.getToken(),
            },
            body: data,
            expectResponseHeaders: true,
        };

        var self = this;
        var promise = new Promise(function(resolve, reject) {
            request('POST', requestParams)
                .then(function(res) {
                    log.debug("DSS I: data stream created: " + JSON.stringify(res));

                    try {
                        var response = JSON.parse(res.body);

                        var streamUri   = res.headers.Location;
                        var entitiesUri = response._metadata.cliententities;
                        var eventsUri   = response._metadata.clientevents;

                        var eventStream = new EventStream({config: self._config,
                                datasync: self,
                                network: self._network,
                                router:  self._router,
                            },
                            streamUri, entitiesUri, eventsUri);

                        self._router.addEventStream(eventStream);
                        resolve(eventStream);
                    }
                    catch(e) {
                        if(e instanceof SyntaxError) {
                            reject("Bad answer from server. Valid JSON expected.");
                        }
                        else {
                            throw e;
                        }
                    }

                },
                function(res) {
                    log.error("DSS E: failed to create data stream!");
                    reject(res);
                });
        });

        return promise;
    };

    /**
     *  Open exiting event stream by given URI
     *  @param {string} uri Stream location
     */
    DataSyncClient.prototype.openEventStream = function(uri)
    {
        var self = this;

        var requestParams = {
            url: uri,
            headers: {
                'Content-Type': 'application/json',
                'X-Twilio-Token': this._config.getToken()
            },
            expectResponseHeaders: true,
        };

        var promise = new Promise(function(resolve, reject) {
            request('GET', requestParams)
                .then(function(res) {

                    try {
                        var response = JSON.parse(res.body);

                        var streamUri   = uri;
                        var entitiesUri = response._metadata.cliententities;
                        var eventsUri   = response._metadata.clientevents;

                        var eventStream = new EventStream({config: self._config,
                                datasync: self,
                                network: self._network,
                                router:  self._router,
                            },
                            streamUri, entitiesUri, eventsUri);

                        self._router.addEventStream(eventStream);
                        resolve(eventStream);
                    }
                    catch(e) {
                        if(e instanceof SyntaxError) {
                            reject("Bad answer from server. Valid JSON expected.");
                        }
                        else {
                            throw e;
                        }
                    }

                },
                function(res) {
                    reject(res);
                });

        });

        return promise;
    };

    /**
     * Set authentication token
     * If token is already set, it will be replaced with the new one
     *
     * @param {String} Authentication token
     */
    DataSyncClient.prototype.setAuthToken = function(token)
    {
        log.info("DSS I: authTokenUpdated");

        this._config.updateToken(token);
    };

    module.exports = DataSyncClient;


},{"../../util/request":74,"./configuration.js":51,"./dataentity.js":52,"./eventstream.js":53,"./network.js":55,"./router.js":56,"./subscriptions.js":57,"events":12,"loglevel":49,"util":47}],51:[function(require,module,exports){
    'use strict';

    /**
     * @param {String} token - authentication token
     *
     * @class DataSyncConfig
     * @classdesc Settings container for the DataSync library
     */
    function DataSyncConfig(token)
    {
        Object.defineProperties(this, {
            _subscriptionsUri: {value: "https://cds.us1.twilio.com"  + "/v1/subscriptions"},
            _entitiesUri: {value: "https://cds.us1.twilio.com" + "/v1/entities"},
            _streamsUri: {value: "https://cds.us1.twilio.com" + "/v1/event-streams"},
            _token: {value: token, writable: true},
        });

        this.getToken = function()
        {
            return this._token;
        };

        this.getSubscriptionsUri = function()
        {
            return this._subscriptionsUri;
        };

        this.getEntitiesUri = function()
        {
            return this._entitiesUri;
        };

        this.getStreamsUri = function()
        {
            return this._streamsUri;
        };
    }

    DataSyncConfig.prototype.updateToken = function(token)
    {
        this._token = token;
    };

    module.exports = DataSyncConfig;


},{}],52:[function(require,module,exports){
    'use strict';

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var request = require('../../util/request');
    var JsonDiff = require('../../util/jsondiff');
    var log = require('loglevel');

    /**
     *  @class CoreDataEntity
     *  @classdesc Represents a DSS object
     *
     *  @constructor
     */
    function CoreDataEntity(params, uri, etag, metadata)
    {
        this._config   = params.config;
        this._datasync = params.datasync;
        this._network  = params.network;
        this._router   = params.router;

        this._pendingListeners = { };
        this._isSynced = true;

        this._entity_uri = uri;
        this._etag = this._sanitizeETag(etag);
        this._metadata = metadata;

        this._initialize();

        EventEmitter.call(this);
    }
    inherits(CoreDataEntity, EventEmitter);

    /**
     * URI of entity
     * - identifies entity globally
     * - can be used to open entity later
     */
    CoreDataEntity.prototype.getURI = function()
    {
        return this._entity_uri;
    };

    /**
     * @private
     */
    CoreDataEntity.prototype._initialize = function() {
        var self = this;

        ['keyAdded', 'keyRemoved', 'keyUpdated'].forEach(function(eventName) {
            self._pendingListeners[eventName] = { };

            self.on(eventName, function(path, data) {
                var handlers = self._pendingListeners[eventName][path] || [];
                handlers.forEach(function(handler) { handler(data); });

                self._pendingListeners[eventName][path] = [];
            });
        });
    };

    /**
     * @private
     */
    CoreDataEntity.prototype._updateETag = function(etag) {
        this._etag = this._sanitizeETag(etag);
    };

    /**
     * Sanitizes ETag: strips buggy double quotes around it, and possible -gzip suffix
     * @private
     */
    CoreDataEntity.prototype._sanitizeETag = function(etag) {

        { // strip quotes if needed: 
            var hasBuggyQuotes = etag.indexOf('"') === 0 && etag.lastIndexOf('"') === etag.length -1;
            if(hasBuggyQuotes) {
                etag = etag.substring(1, etag.length -1);
            }
        }

        { // strip -gzip part from etag
            var idx = etag.indexOf('-');
            if(idx > 0) {
                etag = etag.substr(0, idx);
            }
        }

        return etag;
    };

    /**
     * Update data entity with new data
     * @private
     */
    CoreDataEntity.prototype._update = function(update)
    {
        this._metadata = update._metadata;
        this._etag = update.revision;

        var originalData = this._data;
        if(originalData._metadata) {
            // Shouldn't be there at all!
            delete originalData._metadata;
        }

        this._data = update.data;
        this._traverse(originalData, update.data);

        this.emit('updated', update.data);
    };

    /**
     * Calculate diff between old and new data
     * @private
     */
    CoreDataEntity.prototype._traverse = function(originalData, updatedData)
    {
        var diff = JsonDiff.diff(originalData, updatedData);
        diff.forEach(function(row) {
            if(row.op === 'add' && row.path !== '/_metadata')
            {
                this.emit('keyAdded', row.path, row.value);
            }
            else if(row.op === 'replace')
            {
                this.emit('keyUpdated', row.path, row.value);
            }
            else if(row.op === 'remove')
            {
                this.emit('keyRemoved', row.path);
            }
        }.bind(this));
    };

    /**
     * Notifies user that he should resolve the conflict
     * If user hasn't setup any conflict event handlers, it fails immediately
     * @private
     */
    CoreDataEntity.prototype._resolveConflict = function(conflictResolver)
    {
        if(!(conflictResolver && typeof conflictResolver === 'function')) {
            return Promise.reject(new Error("Can't resolve conflict"));
        }

        return new Promise(function(resolve, reject) {
            var etag      = this._etag;
            var localData = this._data;

            var rollback = function rollback(err) {
                this._etag = etag;
                this._data = localData;
                reject(err);
            }.bind(this);

            this.forceSync()
                .then(function() {
                    conflictResolver({
                        localData: localData,
                        remoteData: this._data,
                        resolve: resolve,
                        reject: rollback,
                    });
                }.bind(this));

        }.bind(this));
    };

    /**
     * Subscribe to changes of data entity
     */
    CoreDataEntity.prototype.subscribe = function()
    {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self._router.subscribe(self._entity_uri, self)
                .then(function(isNewSubscription) {
                    if(isNewSubscription) {
                        self.softSync();
                    }

                    resolve();
                },
                function(reason) {
                    reject(reason);
                });
        });

        return promise;
    };

    /**
     * Unsubscribe from changes of current data entity
     */
    CoreDataEntity.prototype.unsubscribe = function()
    {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self._router.unsubscribe(self._entity_uri, self)
                .then(function(isLastSubscription) {
                    resolve();
                },
                function(reason) {
                    reject(reason);
                });
        });

        return promise;
    };

    /**
     * @returns {Object} Internal data of entity
     */
    CoreDataEntity.prototype.getData = function()
    {
        return this._data;
    };

    CoreDataEntity.prototype.setData = function(data)
    {
        this._data = data;
    };

    /**
     * @private
     */
    CoreDataEntity.prototype._pushChangesInternal = function(resolve, reject)
    {
        delete this._data._metadata;

        var requestParams = {
            url: this._entity_uri,
            headers: {
                'Content-Type': 'application/json',
                'X-Twilio-Token': this._config.getToken(),
                'If-Match': this._etag,
            },
            body: this._data,
            expectResponseHeaders: true,
        };

        return request('PUT', requestParams)
            .then(function(res) {
                var etag = res.headers.ETag;
                log.debug("DSS: entity updated: " + res + ", new ETag is: " + etag);
                this._updateETag(res.headers.ETag);

                resolve(res);

                this._router.emulateUpdate(this, this._entity_uri, {revision: etag,
                    metadata: this._metadata,
                    data:     this._data});
            }.bind(this))
            .catch(reject);
    };


    /**
     * Push changes to the server
     * @public
     */
    CoreDataEntity.prototype.pushChanges = function(conflictResolver)
    {
        return new Promise(function(resolve, reject) {

            var handleMerge = function handleMerge(mergedData) {

                this.setData(mergedData);
                setTimeout(function() {
                    this._pushChangesInternal(resolve, handleError);
                }.bind(this), 0);
            }.bind(this);

            var handleError = function handleError(err) {
                if(err.status === 412) {
                    log.info("DSS I: version conflict detected!");
                    this._resolveConflict(conflictResolver)
                        .then(handleMerge)
                        .catch(reject);
                }
                else {
                    log.error("DSS E: failed to push local changes to server: ", err);
                    reject(err);
                }
            }.bind(this);

            this._pushChangesInternal(resolve, handleError);

        }.bind(this));
    };

    /**
     * Get new data from server
     */
    CoreDataEntity.prototype.softSync = function()
    {
        var self = this;

        return new Promise(function(resolve, reject) {
            self._network.getEntity(self._entity_uri)
                .then(function(response) {

                    var etag = self._sanitizeETag(response.headers.ETag);

                    var data = response.body;
                    var metadata = response.body._metadata;
                    delete data._metadata;

                    self._update({revision:   etag,
                        metadata: metadata,
                        data:     data});

                    resolve(self);

                }, function(reason) {
                    log.error("DSS E: failed to get entity: " + reason);
                    reject(reason);
                });
        });
    };

    /**
     * Download new data from service and overwrite local changes
     * Won't fire any events and callbacks about changes
     */
    CoreDataEntity.prototype.forceSync = function()
    {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self._network.getEntity(self._entity_uri)
                .then(function(response) {

                    var etag = response.headers.ETag;
                    self._metadata = response.body._metadata;
                    self._data = response.body;
                    self._updateETag(etag);

                    resolve(self);

                }, function(reason) {
                    log.error("DSS E: failed to get entity: " + reason);
                    reject(reason);
                });
        });

        return promise;
    };

    CoreDataEntity.prototype.addEventHandler = function(eventName, path, handler) {
        var handlers = this._pendingListeners[eventName][path] || [];
        handlers.push(handler);
        this._pendingListeners[eventName][path] = handlers;
    };

    /**
     * Get value by given path
     * @param {string} path JSON path
     */
    CoreDataEntity.prototype.value = function(path)
    {
        path = path.replace(/^\/|\/$/gm,'');
        var pathArr = path.split('/');

        var obj = this.getData();
        for(var idx = 0; idx < pathArr.length; ++idx)
        {
            obj = obj[pathArr[idx]];
        }

        return obj;
    };

    /**
     *  Updates the value by given path
     *
     *  Value should be the same type - you can't update
     *  the object or array with the string type
     *
     *  To replace node with the value of another type, see {@see replace}
     *
     *  @param path - JSON Pointer path to the node
     *  @param value - The value to update.
     */
    CoreDataEntity.prototype.update = function(path, value)
    {
        path = path.replace(/^\/|\/$/gm,'');
        var pathArr = path.split('/');
        for(var idx = 0; idx < pathArr.length; )
        {
            if(pathArr[idx] === '')
                pathArr.splice(idx,1);
            else
                ++idx;
        }

        var found = true;
        var obj = this.getData();
        for(var idx = 0; idx < pathArr.length; ++idx)
        {
            obj = obj[pathArr[idx]];
            if(obj === undefined)
            {
                found = false;
                break;
            }
        }

        if(found)
        {
            if((typeof obj == 'object') ^ (typeof value == 'object'))
            {
                log.error("Can't have different type when updating the value!");
                return false;
            }

            switch(typeof value)
            {
                case 'object':
                    for(var key in value)
                    {
                        obj[key] = value[key];
                    }
                    break;
                default:
                    obj = value;
            }

            return true;
        }

        return false;
    };

    module.exports = CoreDataEntity;


},{"../../util/jsondiff":73,"../../util/request":74,"events":12,"loglevel":49,"util":47}],53:[function(require,module,exports){
    'use strict';

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var request = require('../../util/request');
    var log = require('loglevel');

    var EventStreamEntity = require('./eventstreamentity');

    /**
     *
     * @class EventStream
     * @classdesc
     */
    function EventStream(params, streamUri, entitiesUri, eventsUri)
    {
        EventEmitter.call(this);

        Object.defineProperties(this, {
            _config: {value: params.config, writable: false},
            _params: {value: params, writable: false},

            _streamUri:   {value: streamUri, writable: false},
            _entitiesUri: {value: entitiesUri, writable: false},
            _eventsUri:   {value: eventsUri, writable: false},

            _entities:    {value: {}, writable: true},
        });
    }
    inherits(EventStream, EventEmitter);

    /**
     * Stream URI
     */
    EventStream.prototype.getURI = function()
    {
        return this._streamUri;
    };

    /**
     * URI of entities for given event stream
     */
    EventStream.prototype.getEntitiesURI = function()
    {
        return this._entitiesUri;
    };

    /**
     * Subscribe on event stream events
     * Should be called to receive entityAdded, entityUpdated, entityRemoved events
     */
    EventStream.prototype.subscribe = function()
    {
        var self = this;
        var promise = new Promise(function(resolve, reject) {

            self._params.router.subscribe(self._streamUri, self)
                .then(function(isNewSubscription) {
                    resolve();
                },
                function(reason) {
                    reject(reason);
                });

        });

        return promise;
    };
    /**
     * Unsubscribe from event stream event
     * Events will no longer be fired
     */
    EventStream.prototype.unsubscribe = function()
    {
        var self = this;
        var promise = new Promise(function(resolve, reject) {

            self._params.router.unsubscribe(self._entitiesUri, self)
                .then(function(wasLastSubscription) {
                    resolve();
                },
                function(reason) {
                    reject(reason);
                });

        });

        return promise;
    };

    EventStream.prototype.add = function(value)
    {
        var self = this;
        var promise = new Promise(function(resolve, reject) {

            request('POST', {
                url: self._entitiesUri,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Twilio-Token': self._config.getToken(),
                },
                body: value
            }).then(function(res) {
                var response = JSON.parse(res);
                resolve(response.index);
            }, function(reason) {
                reject(reason);
            });
        });
        return promise;
    };

    /**
     * Remove event stream entity by id
     * @returns Promise to remove, which may fail
     */
    EventStream.prototype.remove = function(id)
    {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            request('DELETE', {
                url: self._entitiesUri + '/' + id,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Twilio-Token': self._config.getToken(),
                },
            }).then(function(res) {
                resolve();
            }, function(reason) {
                reject(reason);
            });
        });

        return promise;
    };

    EventStream.prototype.update = function(id, value)
    {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            request('PUT', {
                url: self._entitiesUri + '/' + id,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Twilio-Token': self._config.getToken(),
                },
                body: value,
            }).then(function(res) {
                resolve();
            }, function(reason) {
                reject(reason);
            });
        });

        return promise;
    };

    /**
     * Retrieve event stream element by id
     * @param {Number} id - entity id
     */
    EventStream.prototype.get = function(id)
    {
        var self = this;

        if(this._entities.id)
            return Promise.resolve(this._entities.id);

        var promise = new Promise(function(resolve, reject) {
            self._params.datasync.openEntity(self._entitiesUri + '/' + id)
                .then(function(entity) {
                    self._entities.id = entity;
                    resolve(entity);
                }, function(reason) {
                    reject(reason);
                });
        });
        return promise;
    };

    /**
     *  Query entities from the stream
     *
     *  @param {String} direction Direction for querying, can be 'forward' or 'backwards'
     *  @param {String} from Entity, which should be used as an anchor, or "end" if it should be got from end
     *  @param {Number} count - amount of entities to get
     *  @param {String} order - order of entities, should be 'asc' or 'desc'
     */
    EventStream.prototype.queryEntities = function(direction, from, count, order)
    {
        var _anchor = (from !== undefined) ? from : 'end';
        var _order  = (order !== undefined) ? order : 'asc';

        var self = this;
        var promise = new Promise(function(resolve, reject) {

            var uri = self._entitiesUri + '?direction=' + direction + '&from=' + _anchor + '&order=' + _order + '&limit=' + count;
            self._params.network.getEntity(uri)
                .then(function(result) {
                    var queryResult = [];
                    result.body.forEach(function(element) {
                        var streamEntity = new EventStreamEntity(element);
                        queryResult.push(streamEntity);

                        self._entities[streamEntity.getEntityId()] = streamEntity;
                    });

                    resolve(queryResult);
                })
                .catch(function(reason) {
                    reject(reason);
                });
        });

        return promise;
    };

    /**
     *  Query entities from the stream
     *
     *  @param {String} from Entity, which should be used as an anchor, or "end" if it should be got from end
     *  @param {Number} count - amount of entities to get
     *  @param {String} order - order of entities, should be 'asc' or 'desc'
     */
    EventStream.prototype.queryEntitiesBefore = function(from, count, order)
    {
        return this.queryEntities('backwards', from, count, order);
    };

    /**
     * Query last entities from event stream
     * @param {Integer} count Number of entities to fetch
     * @param {String} order Order of entites. Could be 'asc' or 'desc'
     */
    EventStream.prototype.queryLastEntities = function(count, order)
    {
        return this.queryEntitiesBefore('end', count, order);
    };

    /**
     * Force to check for modifications on server
     * If there are any modifications, object will fire all appropriate callbacks
     */
    EventStream.prototype.softSync = function()
    {
        var pageSize = 100;

        var keys = Object.keys(this._entities);
        keys.push(-1) // In case of empty cache we want to start from 0
        var from = Math.max.apply(Math, keys) + 1;

        this.queryEntities('forward', from, pageSize, 'asc')
            .then(function(result) {
                result.forEach(function(streamEntity) {
                    this.emit('entityAdded', streamEntity);
                }.bind(this));

                if(result.length == pageSize) {
                    // Whole page exists, we should check for next one
                    log.debug("DSS I: soft sync: requesting one more page");
                    setTimeout(function() { this.softSync}.bind(this), 0);
                }
            }.bind(this));
    };

    /**
     * Handle update, which came from the server
     */
    EventStream.prototype._update = function(data)
    {
        var metadata = data._metadata;
        delete data._metadata;

        switch(metadata.change) {
            case "entityAdded": {
                this._handleEntityAdded(metadata.index, metadata, data);
            }
                break;
            case "entityUpdated": {
                this._handleEntityUpdated(metadata.index, metadata, data);
            }
                break;
            case "entityRemoved": {
                this._handleEntityRemoved(metadata.index, metadata, data);
            }
                break;
        }

    };

    /**
     * Handle entity insertion event, coming from server
     * @private
     */
    EventStream.prototype._handleEntityAdded = function(index, metadata, data)
    {
        var streamEntity = new EventStreamEntity({
            entityId: metadata.index,
            entityUri: metadata.clientlocation,
            entity: data});

        this._entities[index] = streamEntity;
        this.emit('entityAdded', streamEntity);
    };

    /**
     * Handle new value of entity, coming from server
     * @private
     */
    EventStream.prototype._handleEntityUpdated = function(index, metadata, data)
    {
        var streamEntity = new EventStreamEntity({
            entityId: metadata.index,
            entityUri: metadata.clientlocation,
            entity: data});

        this._entities[index] = streamEntity;
        this.emit('entityUpdated', streamEntity);
    };

    /**
     * @private
     */
    EventStream.prototype._handleEntityRemoved = function(index)
    {
        this._entities[index] = undefined;
        this.emit('entityRemoved', index);
    };

    module.exports = EventStream;


},{"../../util/request":74,"./eventstreamentity":54,"events":12,"loglevel":49,"util":47}],54:[function(require,module,exports){
    'use strict';


    /**
     * @class
     * @classdesc Entity of event stream collection
     */
    function EventStreamEntity(data)
    {
        Object.defineProperties(this, {
            _entityId:  { value: data.entityId, writable: false },
            _entityUri: { value: data.entityUri, writable: false },
            _entity:    { value: data.entity, writable: false },
        });
    }

    EventStreamEntity.prototype.getEntityId = function()
    {
        return this._entityId;
    };

    EventStreamEntity.prototype.getEntityUri = function()
    {
        return this._entityUri;
    };

    /**
     * @returns Internal data of entity
     */
    EventStreamEntity.prototype.getValue = function()
    {
        return this._entity;
    };

    module.exports = EventStreamEntity;


},{}],55:[function(require,module,exports){
    'use strict';

    var request = require('../../util/request');
    var log = require('loglevel');

    /**
     * @class Network
     * @classdesc Separates network "GET" operations to make it possible to add some optimization/chaching strategies
     */
    function Network(config)
    {
        this._config = config;
        this._activeRequests = {};
    }

    /**
     * Returns entity which is located by given URI
     */
    Network.prototype.getEntity = function(uri)
    {
        var self = this;

        if(this._activeRequests[uri])
        {
            return this._activeRequests[uri];
        }
        else
        {
            var promise = new Promise(function(resolve, reject) {

                var requestParams = {
                    url: uri,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Twilio-Token': self._config.getToken(),
                    },
                    expectResponseHeaders: true,
                };

                request('GET', requestParams)
                    .then(function(res) {
                        log.trace("DSS I: entity opened: " + res );
                        //self._activeRequests[uri] = undefined;
                        delete self._activeRequests[uri];

                        res.body = JSON.parse(res.body);
                        resolve(res);
                    }, function(reason) {
                        log.error("DSS E: failed to get entity: " + reason);
                        reject(reason);
                    });
            });

            self._activeRequests[uri] = promise;
            return promise;
        }
    };

    module.exports = Network;


},{"../../util/request":74,"loglevel":49}],56:[function(require,module,exports){
    'use strict';

    var log = require('loglevel');

    /**
     * @class Router
     * @classdesc Routes all incoming messages to the consumers
     */
    function Router(params)
    {
        Object.defineProperties(this, {
            _config:        { value: params.config },
            _subscriptions: { value: params.subscriptions },
            //    _entities:      { value: [] },
            //    _eventStreams:  { value: [] },
        });
    }

    /**
     * Entry point for all incoming messages
     * @param {String} type - Type of incoming message
     * @param {Object} message - Message to route
     */
    Router.prototype.onMessage = function(type, message)
    {
        log.trace("DSS I: message " + type + " : " + JSON.stringify(message));

        var uri;
        if(type === 'cdsObjectUpdate') {
            uri = message._metadata.clientlocation;
            this._subscriptions.getSubscribers(uri)
                .forEach(function(entity) {

                    var copiedMessage = JSON.parse(JSON.stringify(message));

                    var revision = copiedMessage._metadata.revision;
                    var metadata = copiedMessage._metadata;
                    delete copiedMessage._metadata;
                    var data = copiedMessage;

                    entity._update({revision: revision, metadata: metadata, data: data });

                });

        } else if (type === 'cdsStreamUpdate') {
            uri = message._metadata.clientlocation;
            this._subscriptions.getSubscribers(uri)
                .forEach(function(eventStream) {
                    if(eventStream.getURI() == message._metadata.clientlocation)
                    {
                        var copiedMessage = JSON.parse(JSON.stringify(message));
                        eventStream._update(copiedMessage);
                    }
                });
        }
    };

    /**
     * Notifiy all other local instances of entity about changes
     */
    Router.prototype.emulateUpdate = function(source, uri, data)
    {
        this._subscriptions.getSubscribers(uri)
            .forEach(function(subscriber) {
                if(subscriber !== source) {
                    var copiedData = JSON.parse(JSON.stringify(data));
                    subscriber._update(copiedData);
                }
            });
    };

    /**
     * Add entity to the routing table
     */
    Router.prototype.addEntity = function(entity)
    {
        //this._entities.push(entity);
    };

    /**
     * Remove entity from the routing table
     */
    Router.prototype.removeEntity = function(entity)
    {
        /*
         this._subscriptions.remove(entity.getURI(), entity)
         .then(function() {

         for (var idx = this._entities.length - 1; idx >= 0; idx -= 1) {
         if (this._entities[idx].getURI() === entity.getURI()) {
         this._entities.splice(idx, 1);
         break;
         }
         } 

         }.bind(this));
         */
    };

    /**
     * Add event stream to the routing table
     */
    Router.prototype.addEventStream = function(eventStream)
    {
        //this._eventStreams.push(eventStream);
    };

    /**
     * Add event stream from the routing table
     */
    Router.prototype.removeEventStream = function(eventStream)
    {
        /*
         this._subscriptions.remove(eventStream.getURI(), eventStream)
         .then(function() {
         for (var idx = this._eventStreams.length - 1; idx >= 0; idx -= 1) {
         if (this._eventStreams[idx].getURI() === eventStream.getURI()) {
         this._eventStreams.splice(idx, 1);
         break;
         }
         } 
         }.bind(this));
         */
    };

    /**
     * Subscribe for events
     */
    Router.prototype.subscribe = function(entityUrl, entity)
    {
        return this._subscriptions.add(entityUrl, entity);
    };

    /**
     * Unsubscribe from events
     */
    Router.prototype.unsubscribe = function(entityUrl, entity)
    {
        return this._subscriptions.remove(entityUrl, entity);
    };

    /**
     * Handle transport establishing event
     * If we have any subscriptions - we should check object for modifications
     */
    Router.prototype.onConnected = function()
    {
        // Endpoint could be an entity or event stream,
        // probably need to make some superclass for them
        this._subscriptions.forEach(function(uri, endpoint) {
            endpoint.softSync();
        });
    };


    module.exports = Router;


},{"loglevel":49}],57:[function(require,module,exports){
    'use strict';

    var request = require('../../util/request');
    var log = require('loglevel');


    /**
     * @class Subscriptions
     * @classdesc Subscriptions container for CDS objects
     *
     * @constructor
     */
    function Subscriptions(config)
    {
        Object.defineProperties(this, {
            _config: {value: config},
            _subscriptions: { value: new Map() },
            _serverSubscriptions: { value: new Map() },
        });
    }

    /**
     * @private
     */
    Subscriptions.prototype._subscribeOnServer = function(entityUri)
    {
        return new Promise(function(resolve, reject) {
            var requestParams = {
                url: this._config.getSubscriptionsUri(),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Twilio-Token': this._config.getToken(),
                },
                body: {
                    subscription: {
                        objectUrl:   entityUri,
                        channelType: 'twilsock',
                    }
                },
                expectResponseHeaders: true,
            };

            request('POST', requestParams)
                .then(function(res) {
                    log.debug("DSS I: subscribed: ", res.headers.Location);
                    this._serverSubscriptions.set(entityUri, res.headers.Location);

                    resolve(true);
                }.bind(this))
                .catch(function(res) {
                    log.error("DSS E: subscription failed: ", res);
                    reject(res);
                });
        }.bind(this));
    };

    /**
     * @private
     */
    Subscriptions.prototype._unsubscribeOnServer = function(entityUri)
    {
        return new Promise(function(resolve, reject) {
            var subscriptionUri = this._serverSubscriptions.get(entityUri);

            if(!subscriptionUri) {
                reject(new Error("No such subscription"));
                return;
            }

            var requestParams = {
                url: subscriptionUri,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Twilio-Token': this._config.getToken(),
                },
                expectResponseHeaders: true,
            };

            request('DELETE', requestParams)
                .then(function(res) {
                    log.debug("DSS I: subscription deleted: ", res);
                    this._serverSubscriptions.delete(entityUri);
                    resolve(true);
                }.bind(this))
                .catch(function(err) {
                    if(err.status === 404) {
                        log.debug("DSS I: subscription is already deleted");
                        resolve(true);
                    } else {
                        log.error("DSS E: delete subscription failed: ", err);
                        reject(err);
                    }
                });
        }.bind(this));
    };

    /**
     * Add subscription
     * @param {string} uri URI to the server object
     * @param {object} endpoint Endpoint object
     */
    Subscriptions.prototype.add = function(entityUri, entity)
    {
        var self = this;

        if(this._subscriptions.has(entityUri)) {
            var subscribers = this._subscriptions.get(entityUri);
            subscribers.add(entity);
            return Promise.resolve(false);
        }
        else {
            var subscribers = new Set();
            subscribers.add(entity);

            return new Promise(function(resolve, reject) {
                this._subscribeOnServer(entityUri)
                    .then(function() {
                        this._subscriptions.set(entityUri, subscribers);
                        resolve(true);
                    }.bind(this))
                    .catch(function(err) {
                        reject(err);
                    });
            }.bind(this));
        }
    };


    /**
     * Remove subscription for the entity
     * @param {string} entityUri URI
     * @param {object} endpoint Endpoint object
     */
    Subscriptions.prototype.remove = function(entityUri, entity)
    {
        if(!(this._subscriptions.has(entityUri) && this._subscriptions.get(entityUri).has(entity)))
        {
            return Promise.resolve(true);
        }
        else
        {
            var subscribers = this._subscriptions.get(entityUri);
            subscribers.delete(entity);

            if(subscribers.length > 0) {
                this._subscriptions.set(entityUri, subscribers);
                return Promise.resolve(false);
            }
            else {
                this._subscriptions.delete(entityUri);
                return this._unsubscribeOnServer(entityUri);
            }
        }
    };

    /**
     * Query subscribers for given URI
     * @return {set}
     */
    Subscriptions.prototype.getSubscribers = function(entityUri)
    {
        var subscribers = this._subscriptions.get(entityUri);
        if(subscribers) {
            return subscribers;
        } else {
            return new Set();
        }
    };


    /**
     * Iterates through all subscriptions
     * @param {function} callback
     */
    Subscriptions.prototype.forEach = function(handler)
    {
        this._subscriptions.forEach(function(subscribers, uri) {
            subscribers.forEach(function(subscriber) {
                handler(uri, subscriber);
            });
        });
    };

    module.exports = Subscriptions;


},{"../../util/request":74,"loglevel":49}],58:[function(require,module,exports){
    'use strict';

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var log = require('loglevel');

    var JsonDiff = require('../../util/jsondiff');

    var Members = require('./members');
    var Messages = require('./messages');

    /**
     * @class Channel
     * @classdesc Represents channel object
     */
    function Channel(datasync, session, sid, uri, type, name, attributes)
    {
        if(!type) { type = 'public'; }

        if(!attributes) { attributes = {}; }
        else { this._checkValidAttributes(attributes); }

        var fields = {};
        Object.defineProperties(fields, {
            name: {value: name, writable: true},
            attributes: { value: attributes, writable: true }
        });

        Object.defineProperties(this, {
            _datasync: {value: datasync, writable: false},
            _session:  {value: session,  writable: false},

            _sid: {value: sid, writable: true},
            _uri:  {value: uri,  writable: true},
            _type: {value: type, writable: true},
            _state: { value: "", writable: true},

            _fields: {value: fields, writable: true},
        });

        EventEmitter.call(this);
    }

    inherits(Channel, EventEmitter);

    /**
     * @private
     */
    Channel.prototype._initialize = function(sid, uri)
    {
        this._sid = sid;
        this._uri  = uri;
    };

    /**
     * Checks if channel should be subscribed on changes in given state
     * @private
     */
    Channel.prototype._isNeedToSubscribe = function(state)
    {
        switch(state) {
            case 'joined':
            case 'invited':
                return true;

            default:
                return false;
        }
    };

    /**
     * @returns {bool} true if channel is exists on server
     */
    Channel.prototype._isServerChannel = function(state)
    {
        return !!this._sid;
    };

    /**
     * @private
     */
    Channel.prototype._getEntity = function()
    {
        var self = this;

        if(!self._entityPromise) {
            self._entityPromise = new Promise(function(resolve, reject) {
                self._datasync.openEntity(self._uri)
                    .then(function(entity) {
                        self._entity = entity;

                        // joined and invited channels needs to be updated
                        if(self._isNeedToSubscribe(self._state) ) {
                            entity.subscribe();

                            // Force members and messages events to happen
                            self.getMessages().then(function(messages) { messages.getMessages(); });
                            self.getMembers().then(function(members) { });
                        }

                        entity.on('updated', function(data) {
                            self._update(data);
                        });

                        self._update(entity.getData());

                        resolve(entity);

                    }, function(reason) {
                        log.error("IPMSG E: can't open entity " + self._uri);
                        reject();
                    });
            });
        }

        return self._entityPromise;
    };

    /**
     * @private
     */
    Channel.prototype._checkValidAttributes = function(attributes)
    {
        if(attributes && typeof attributes !== 'object') {
            throw new Error("Unsupported data type for attributes: " + typeof attributes);
        }
    };

    /**
     * @private
     */
    Channel.prototype._fetch = function()
    {
        return this._getEntity();
    };

    /**
     * @private
     */
    Channel.prototype._setState = function(state)
    {
        if(this._state !== state)
        {
            this._state = state;

            if(this._isNeedToSubscribe(state)) {
                this._getEntity().then(function(entity) {
                    entity.subscribe();

                    // Force members and messages events to happen
                    this.getMessages().then(function(messages) {
                        messages._subscribe();
                    });

                    this.getMembers().then(function(members) {
                        members._subscribe();
                    });
                }.bind(this));
            }
            else if(this._entity) {
                this._entity.unsubscribe();

                this.getMessages().then(function(messages) {
                    messages._unsubscribe();
                });

                this.getMembers().then(function(members) {
                    members._unsubscribe();
                });
            }
        }
    };

    /**
     * Update channel fields according to the underlying entity
     * @private
     */
    Channel.prototype._update = function(update)
    {
        // TODO: impelemnt that in more proper way. 
        // Probably we should move channel data to dedicated descriptor 
        var changed = false;

        var fieldsToSet = {};
        fieldsToSet.name = update.name;

        try {
            fieldsToSet.attributes = JSON.parse(update.attributes);
        } catch(e) {
            log.trace("IPMSG E: got malformed attributes, dropping them");
            fieldsToSet.attributes = {};
        }

        var type = 'public';
        if(update.type) {
            type = update.type;
        }


        if(!JsonDiff.isDeepEqual(this._fields, fieldsToSet) || this._type!=type) {
            this._fields = fieldsToSet;
            this._type = type;
            this.emit('updated');
        }
    };

    /**
     * Update channel fields with according to the underlying entity
     * @param {Object} update New set of properties
     */
    Channel.prototype.update = function(update)
    {
        return new Promise(function(resolve, reject){
            if(!this._isServerChannel()) {
                this._checkValidAttributes(update.attributes);
                this._update({sid: update.sid,
                    type: update.type,
                    name: update.name,
                    attributes: JSON.stringify(update.attributes),
                });

                resolve();

            } else {
                var promises = [];
                if(update.type) { promises.push(this.updateType(update.type)); }
                if(update.name) { promises.push(this.updateName(update.name)); }
                if(update.attributes) { promises.push(this.updateAttributes(update.attributes)); }

                Promise.all(promises)
                    .then(function(){
                        this.emit('updated');
                        resolve();
                    }.bind(this))
                    .catch(function(err) { reject(err); });
            }
        }.bind(this));
    };

    /**
     * @returns {String} Returns channel id
     */
    Channel.prototype.getId = function()
    {
        return this._sid;
    };

    /**
     * @returns {Members} Returns members collection
     */
    Channel.prototype.getMembers = function()
    {
        var self = this;
        if(!self._membersPromise) {
            self._membersPromise = new Promise(function(resolve, reject) {
                self._getEntity().then(function(entity) {
                    var members  = new Members({datasync: self._datasync, session: self._session, entity: entity, channelSid: self._sid});
                    resolve(members);
                })
                    .catch(function() { reject(); });
            });
        }

        return this._membersPromise;
    };

    /**
     * @returns Promise with channel messages collection
     */
    Channel.prototype.getMessages = function()
    {
        var self = this;
        if(!self._messagesPromise) {
            self._messagesPromise = new Promise(function(resolve, reject) {

                self._getEntity().then(function(entity) {
                    var messagesUri = entity.value('/messages/clientlocation');
                    var messages = new Messages(self._datasync, self._session, self._sid, messagesUri);
                    resolve(messages);
                })
                    .catch(function() {
                        reject();
                    });
            });
        }

        return self._messagesPromise;
    };

    /**
     * Sets the channel name
     * @param {String} name - new name for channel
     * @returns {Object} Promise
     */
    Channel.prototype.updateName = function(name)
    {
        return new Promise(function(resolve, reject) {
            if(this._fields.name != name) {
                this._session.addCommand('editName', {
                    channelSid: this._sid,
                    name: name
                })
                    .then(function(response) {
                        log.trace('Friendly name updated: ' + JSON.stringify(response));
                        resolve(response);
                    })
                    .catch(function(reason) {
                        log.error("Can't update name: " + reason);
                        reject(new Error("Can't update name: " + reason));
                    });
            }
        }.bind(this));
    };

    /**
     * @returns {string} Channel friendly name
     */
    Channel.prototype.getName = function()
    {
        return this._fields.name;
    };

    /**
     * Set new attributes value
     * @param {Object} attributes
     */
    Channel.prototype.updateAttributes = function(attributes)
    {
        return new Promise(function(resolve, reject) {
            if(!JsonDiff.isDeepEqual(this._fields.attributes, attributes)) {

                this._checkValidAttributes(attributes);
                this._session.addCommand('editAttributes', {
                    channelSid: this._sid,
                    attributes: JSON.stringify(attributes),
                })
                    .then(function (response) {
                        log.trace('Attributes updated: ' + JSON.stringify(response));
                        resolve();
                    })
                    .catch(function (err) {
                        log.error("Can't update attributes: ", err);
                        reject("Can't update attributes: " + err);
                    });
            };
        }.bind(this));
    };

    /**
     * @returns {Object} Channel attributes
     */
    Channel.prototype.getAttributes = function()
    {
        return this._fields.attributes;
    };

    /**
     * @returns {String} Channel type
     */
    Channel.prototype.getType = function()
    {
        return this._type;
    };

    /**
     * Right now channel type may be set only initialy, before it was actually created by calling {add} method
     * But this will be changed in future
     *
     * Possible types are 'private' and 'public'
     * @returns Promise which may fail
     */
    Channel.prototype.updateType = function(type)
    {
        if(type !== 'private' && type !== 'public') {
            throw new Error("Can't set unknown channel type " + type);
        }

        if(this._type != type) {
            throw new Error("Changing of channel type isn't supported");
        }

        this._type = type;
        return Promise.resolve();
    };

    /**
     * Join current channel
     * @returns Returns promise which can be failed
     */
    Channel.prototype.join = function()
    {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self._session.addCommand('joinChannel', { channelSid: self._sid })
                .then(function(response) {
                    log.trace("IPMSG: joined to the channel: " + JSON.stringify(response));
                    self._setState('joined');
                    resolve(response.channelUrl);
                }, function(reason) {
                    log.error("IPMSG E: can't join channel: " + reason);
                    reject(new Error("Failed to join to the channel: " + reason));
                });
        });

        return promise;
    };

    /**
     * Leave current channel
     * @returns Returns promise which can be failed
     */
    Channel.prototype.leave = function()
    {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self._session.addCommand('leaveChannel', { channelSid: self._sid })
                .then(function(response) {
                    log.trace("IPMSG: left the channel: " + JSON.stringify(response));
                    self._setState('');
                    resolve(response.channelUrl);
                }, function(reason) {
                    log.error("IPMSG E: can't leave channel: " + reason);
                    reject(new Error("Failed to leave the channel: " + reason));
                });
        });

        return promise;
    };

    /**
     * Decline the invitation to join channel
     */
    Channel.prototype.decline = function()
    {
        return new Promise(function(resolve, reject) {
            this._session.addCommand('declineInvitation', {channelSid: this._sid} )
                .then(function() {
                    this._setState('');
                    resolve();
                }.bind(this))
                .catch(function(error) { reject(error); });
        }.bind(this));
    };

    /**
     * @returns {bool} If user is joined to the channel
     */
    Channel.prototype.isJoined = function()
    {
        return this._state === 'joined';
    };

    /**
     * @returns {bool} Is user is invited to the channel
     */
    Channel.prototype.isInvited = function()
    {
        return this._state === 'invited';
    };

    /**
     * @returns {bool} Is channel of private type
     */
    Channel.prototype.isPrivate = function()
    {
        return this._type === 'private';
    };

    /**
     * Destroys the channel
     */
    Channel.prototype.destroy = function()
    {
        var promise = new Promise(function(resolve, reject) {
            this._session.addCommand('destroyChannel', { channelSid: this._sid })
                .then(function(response) {
                    log.trace("IPMSG: channel destroyed: " + JSON.stringify(response));
                    this.emit('destroyed');
                    resolve(response.channelUrl);
                }.bind(this))
                .catch(function(reason) {
                    log.error("IPMSG E: failed to destroy the channel: " + reason);
                    reject(new Error("Failed to destroy the channel: " + reason));
                });
        }.bind(this));

        return promise;
    };

    module.exports = Channel;

    /**
     * Fired when channel data changes
     * @event Channel#updated
     */


},{"../../util/jsondiff":73,"./members":62,"./messages":64,"events":12,"loglevel":49,"util":47}],59:[function(require,module,exports){
    'use strict';

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var log = require('loglevel');

    var Channel = require('./channel');

    /**
     * Creates an instance of channels collection {@see Channel}
     *
     * @class Channels
     * @classdesc Provides an access to the channels collection
     */
    function Channels(datasync, session)
    {
        Object.defineProperties(this, {
            _datasync: {value: datasync, writable: false},
            _session : {value: session, writable: false},
            _channels: {value: [], writable: true},
            _myChannels: {value: [], writable: true},
        });

        EventEmitter.call(this);
    }

    inherits(Channels, EventEmitter);

    /**
     * Creates the channel object
     * This object doesn't really attached to any channel on the server
     * until {@see add} add function hasn't been called
     */
    Channels.prototype.createChannel = function()
    {
        return new Channel(this._datasync, this._session);
    };

    /**
     * Add channel to the channel list.
     * Creates channel on the server
     * @returns Returns promise which can fail
     */
    Channels.prototype.add = function(channel)
    {
        var self = this;
        return new Promise(function(resolve, reject) {
            self._session.addCommand('createChannel',
                { name: channel.getName(),
                    type: channel.getType(),
                    attributes: JSON.stringify(channel.getAttributes()),
                }
            )
                .then(function(response) {
                    channel._initialize(response.channelSid, response.channelUrl);
                    channel._fetch().then(function() {
                        self._save(channel);
                        resolve(channel);
                    });
                })
                .catch(function(err) {
                    log.error("failed to create channel", err);
                    reject(new Error("Failed to create channel: " + err));
                });
        });
    };

    /**
     * @private
     */
    Channels.prototype._save = function(channel)
    {
        if(!this._channels.some(function(knownChannel) {
                return (knownChannel.getId() === channel.getId());
            })) {
            this._channels.push(channel);
            channel.on('updated', function() {
                this.emit('channelUpdated', channel);
            }.bind(this));
            channel.on('destroyed', function() {
                this.emit('channelDestroyed', channel);
            }.bind(this));
        }
    };

    /**
     * Fetch data about channels which user joined to
     * @private
     */
    Channels.prototype._fetchMyChannels = function(url)
    {
        var self = this;
        if(!this._myChannelsPromise) {
            this._myChannelsPromise = new Promise(function(resolve, reject) {
                this._datasync.openEntity(url)
                    .then(function(entity) {
                        log.trace("IPMSG I: My channels fetched!");
                        this._myChannelsEntity = entity;

                        entity.subscribe();
                        entity.on('keyAdded', function(path, value) {
                            log.trace("MyChannels list updated :: added ");

                            this._updateChannelsState();

                            if (value.status === 'invited') {
                                self.emit('channelInvited', path.substr(1));
                            } else {
                                self.emit('channelJoined', path.substr(1));
                            }
                        }.bind(this));

                        entity.on('keyRemoved', function(path, value) {
                            log.trace("MyChannels list updated :: removed");
                            this._updateChannelsState();
                            self.emit('channelLeft', path.substr(1));
                        }.bind(this));

                        entity.on('keyUpdated', function(path, value) {
                            log.trace("MyChannels list updated :: updated");
                            this._updateChannelsState();
                            self.emit('channelUpdated', path.substr(1), value);
                        }.bind(this));

                        this._updateChannelsState();
                        resolve(this._myChannelsList);

                    }.bind(this), function(res) {
                        log.error("IPMSG E: Can't fetch my channels!");
                        reject(res);
                    }.bind(this));
            }.bind(this));
        }

        return this._myChannelsPromise;
    };

    /**
     * Go through the list and download all private channels to make sure, that they are in usable state
     * @parameter channels List of a channels
     */
    Channels.prototype._downloadChannelsForList = function(channels)
    {
        return new Promise(function(resolve, reject) {
            var channelsPromises = [];
            channels.forEach(function(channel) {
                channelsPromises.push(channel._fetch());
            });

            Promise.all(channelsPromises)
                .then(function() {
                    log.debug("IPMSG I: All channels for given list downloaded!");
                    resolve(channels);
                })
                .catch(reject);
        });
    };

    /**
     * Fetch public channel list from service and create all needed objects
     * @private
     */
    Channels.prototype._fetchPublicChannels = function(url)
    {
        var self = this;
        if(!this._channelsPromise) {
            this._channelsPromise = new Promise(function(resolve, reject) {
                this._datasync.openEntity(url)
                    .then(function(entity) {
                        log.trace("IPMSG I: Channels fetched!");
                        self._channelsEntity = entity;

                        entity.subscribe();
                        entity.on('keyAdded', function(path, value) {

                            var key = path.substr(1);
                            var channel = new Channel(self._datasync, self._session, key, value.channelUrl, value.channelType ? value.channelType : 'public', value.name);
                            self._save(channel);

                            self.emit('publicChannelsUpdated', self._channels);
                            self.emit('channelAdded', key, channel);
                            self._updateChannelsState();
                        });

                        entity.on('keyRemoved', function(path, value) {
                            self.emit('publicChannelsUpdated', self._channels);
                            self.emit('channelRemoved', path.substr(1));
                            self._updateChannelsState();
                        });

                        for(var key in entity.getData())
                        {
                            var channelDescriptor = entity.getData()[key];
                            var attributes = {};

                            if(channelDescriptor.attributes) {
                                attributes = JSON.parse(channelDescriptor.attributes);
                            }

                            var channel = new Channel(self._datasync,
                                self._session,
                                key,
                                channelDescriptor.channelUrl,
                                channelDescriptor.channelType ? channelDescriptor.channelType : 'public',
                                channelDescriptor.name,
                                attributes);

                            self._channels.push(channel);
                        }

                        self._updateChannelsState();
                        resolve(self._channels);

                        self.emit('publicChannelsUpdated', self._channels);
                    }, function(res) {
                        log.error("IPMSG E: Can't fetch channels!");
                        reject(res);
                    });

            }.bind(this));
        }

        return this._channelsPromise;
    };

    /**
     *
     * @returns Returns an array of public channels
     */
    Channels.prototype.getPublicChannels = function()
    {
        return new Promise(function(resolve, reject) {
            this._fetchPublicChannels()
                .then(resolve);
        }.bind(this));
    };

    /**
     * NB: currently it implicitly loads a list of public channels
     * @returns List of channels which user is joined or invited to
     */
    Channels.prototype.getMyChannels = function()
    {
        return new Promise(function(resolve, reject) {
            this._fetchPublicChannels()
                .then(this._fetchMyChannels.bind(this))
                .then(this._downloadChannelsForList.bind(this))
                .then(resolve)
                .catch(reject);

        }.bind(this));
    };

    /**
     * @returns Returns promise to provide channel by given id
     */
    Channels.prototype.getChannel = function(channelSid)
    {
        var self = this;
        var promise = new Promise(function(resolve, reject) {

            var havePublicChannel = self._channels.some(function(channel) {
                if(channel._sid === channelSid) {
                    resolve(channel);
                    return true;
                }
                else {
                    return false;
                }
            });

            var haveMyChannel = self._myChannelsList.some(function(channel) {
                if(channel._sid === channelSid) {

                    if(channel.type === 'private') {
                        channel._getEntity()
                            .then(function() {
                                resolve(channel);
                            });
                    } else {
                        resolve(channel);
                    }

                    return true;
                }
                else {
                    return false;
                }
            });

            if(!havePublicChannel && !haveMyChannel) {
                throw new Error("No channel with id " + channelSid + " found");
            }
        });

        return promise;
    };

    /**
     * Updates the state of channel objects according to the data which we currently have
     * Currently used to mark if we joined to channel or not
     * @private
     */
    Channels.prototype._updateChannelsState = function()
    {
        if(!this._myChannelsEntity)
            return;

        var myChannelsList = [];
        // ugly way to deep copy again, move to some library
        var myChannelDescriptors = JSON.parse(JSON.stringify(this._myChannelsEntity.getData()));

        this._channels.forEach(function(channel) {
            if(myChannelDescriptors.hasOwnProperty(channel.getId())) {
                channel._setState(myChannelDescriptors[channel.getId()].status);
                delete myChannelDescriptors[channel.getId()];

                myChannelsList.push(channel);
            } else {
                channel._setState('');
            }
        });

        // Ugly hack. If we have some orphaned channels, it means that they are private channels
        // For those we need to create all entities
        var privateChannelIds = Object.keys(myChannelDescriptors);
        if(privateChannelIds.length > 0) {
            privateChannelIds.forEach(function(channelId) {

                var channelDescriptor = myChannelDescriptors[channelId];
                var channel = new Channel(this._datasync, this._session, channelId, channelDescriptor.channelUrl, 'private');
                channel._setState(channelDescriptor.status);

                myChannelsList.push(channel);

                channel.on('updated', function() {
                    this.emit('channelUpdated', channel);
                }.bind(this));
                channel.on('destroyed', function() {
                    this.emit('channelDestroyed', channel);
                }.bind(this));

            }.bind(this));
        }


        if(this._myChannelsList !== myChannelsList)
        {
            this._myChannelsList = myChannelsList;
            this.emit('myChannelsUpdated', myChannelsList);
        }
    };

    module.exports = Channels;

    /**
     * Set authentication token
     * If token is already set, it will be replaced with the new one
     *
     * @param {String} Authentication token
     */



},{"./channel":58,"events":12,"loglevel":49,"util":47}],60:[function(require,module,exports){
    'use strict';

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var request = require('../../util/request');
    var log = require('loglevel');

    var Session  = require('./session.js');
    var Channels = require('./channels.js');

    var DataSyncClient = require('../datasync/client');
    var NotificationClient = require('../notification/client');

    /**
     * Constructs a new instance of {@link IPMessaging} client library
     * @constructor
     *
     * @class IPMessaging
     * @classdesc The main class of IPMessaging client library.
     *    Offers the functionality to access and manipulate channels, participants, messages, etc
     *
     * @param token - the access token, given by {@link TokenProvider}
     * @param [notificationClient] - instance of {@link Notification} client library
     * @param [dataSyncClient] - instance of {@link DataSynchronization} client library
     */
    function IPMessaging(token, notificationClient, dataSyncClient)
    {
        log.setLevel(3);

        this.name = 'IPMessaging';
        this._token = token;
        this._notification = notificationClient || new NotificationClient(token);
        this._datasync = dataSyncClient || new DataSyncClient(token, this._notification);

        this._init();
    }

    inherits(IPMessaging, EventEmitter);

    IPMessaging.prototype._getSession = function()
    {
        var self = this;
        if(!this.sessionPromise) {
            this.sessionPromise = new Promise(function(resolve, reject) {
                var session = new Session(self._datasync, self._token);
                session.initialize()
                    .then(function() {
                        resolve(session);
                    })
                    .catch(function(reason) {
                        reject("Failed to get ipmessaging session: " + reason);
                    });
            });
        }

        return this.sessionPromise;
    };

    /**
     * @private
     */
    IPMessaging.prototype._init = function()
    {
        var self = this;
        this._getSession().then(function() {
            self._notification.subscribe('twilio.channel.new_message', 'gcm');
            self._notification.subscribe('twilio.channel.added_to_channel', 'gcm');
        });
    };


    /**
     *  @returns Returns the interface object {@link Channels}, which provides an access channels
     */
    IPMessaging.prototype.getChannels = function()
    {
        var self = this;
        if(!self._channelsPromise) {
            self._channelsPromise = new Promise(function(resolve, reject) {
                self._getSession().then(function(session) {

                    var channels = new Channels(self._datasync, session);
                    session.onKeyUpdated('/channelsUrl', function(url) {

                        channels._fetchPublicChannels(url).then(function() {
                            resolve(channels);
                        })
                            .catch(function(reason) {
                                log.error("Can't fetch channels list: " + reason);
                            });
                    });

                    session.onKeyUpdated('/myChannelsUrl', function(url) {
                        channels._fetchMyChannels(url);
                    });

                });
            });
        }

        return self._channelsPromise;
    };

    /**
     * Set authentication token
     * If token is already set, it will be replaced with the new one
     *
     * @param {String} Authentication token
     */
    IPMessaging.prototype.setAuthToken = function(token)
    {
        log.info("IPMSG I: authTokenUpdated");

        return Promise.all([
            this._notification.setAuthToken(token),
            this._datasync.setAuthToken(token),
            this._getSession().then(function(session) {
                return session.updateToken(token);
            })
        ]);
    };

    module.exports = IPMessaging;


},{"../../util/request":74,"../datasync/client":50,"../notification/client":66,"./channels.js":59,"./session.js":65,"events":12,"loglevel":49,"util":47}],61:[function(require,module,exports){
    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var log = require('loglevel');

    /**
     * Fired when member data is changed
     * @event Member#updated
     */

    /**
     * Creates an instance of channel member
     *
     * @class Member
     * @classdesc Represents the member of the channel
     */
    function Member(params)
    {
        EventEmitter.call(this);

        Object.defineProperties(this, {
            _datasync:  {value: params.datasync, writable: false},
            _uid:       {value: params.uid, writable: false},
            _username:  {value: params.username, writable:false},
        });
    }
    inherits(Member, EventEmitter);


    /**
     * @orivate
     */
    Member.prototype._getUid = function()
    {
        return this._uid;
    };

    Member.prototype.getUsername = function()
    {
        return this._username;
    };

    module.exports = Member;


},{"events":12,"loglevel":49,"util":47}],62:[function(require,module,exports){
    'use strict'

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var log = require('loglevel');

    var Member = require('./member.js');

    /**
     * Fired when member joined channel
     * @event Members#memberJoined
     * @type {Member}
     */

    /**
     * Fired when member left channel
     * @event Members#memberLeft
     * @type {string}
     */

    /**
     * Fired when member info updated
     * Note that event won't be fired if user haven't requested any member data
     *
     * @event Members#memberUpdated
     * @type {Member}
     */

    /**
     * Creates members collection
     *
     * @class Members
     * @classdesc Represents the collection of members for the channel
     */
    function Members(params)
    {
        EventEmitter.call(this);

        Object.defineProperties(this, {
            _datasync   : {value: params.datasync, writable: false},
            _session    : {value: params.session , writable: false},
            _entity     : {value: params.entity  , writable: false},
            _channelSid : {value: params.channelSid, writable: false},
            _members    : {value: [], writable: true},
        });

        this._init();
    }
    inherits(Members, EventEmitter);

    Members.prototype._init = function()
    {
        var roster = this._entity.getData().roster;

        for(var memberUid in roster)
        {
            var memberData = roster[memberUid];
            var member = new Member({datasync: this._datasync,
                uid: memberUid,
                username: memberData.id});

            member.on('updated', function() {
                this.emit('memberUpdated', member);
            }.bind(this));

            this._members.push(member);
            this.emit('memberJoined', member);
        }

        this._entity.on('keyAdded', function(path, value) {

            var membersPath = "/roster/";
            if(path.slice(0, membersPath.length) === membersPath)
            {
                var memberUid = path.slice(membersPath.length, path.length);
                var member = new Member({datasync: this._datasync,
                    uid: memberUid,
                    username: value.id});

                this._members.push(member);
                this.emit('memberJoined', member);
            }
        }.bind(this));

        this._entity.on('keyRemoved', function(path) {

            var membersPath = "/roster/";
            if(path.slice(0, membersPath.length) === membersPath)
            {
                var memberUid = path.slice(membersPath.length, path.length);
                var memberId = null;

                this._members.some(function(member, idx) {
                    if(member._getUid() === memberUid) {
                        memberId = member.getUsername();
                        this._members.splice(idx, 1);
                        return true;
                    } else {
                        return false;
                    }
                }.bind(this));

                if(memberId) {
                    this.emit('memberLeft', memberId);
                }
            }
        }.bind(this));
    };


    /**
     * Subscribe to all members changes
     * @private
     */
    Members.prototype._subscribe = function()
    {
        // There is nothing to do here, because user profile was removed
    };

    /**
     * Unsubscribe from all members changes
     * @private
     */
    Members.prototype._unsubscribe = function()
    {
        // There is nothing to do here, because user profile was removed
    };

    /**
     * @returns Synchronously returns the list of members {@see Member}
     */
    Members.prototype.getMembersList = function()
    {
        return this._members.slice(0);
    };

    /**
     * Add user to the channel
     */
    Members.prototype.add = function(username)
    {
        return new Promise(function(resolve, reject) {

            this._session.addCommand('addMember', {channelSid: this._channelSid, username: username})
                .then(resolve)
                .catch(reject);

        }.bind(this));
    };

    /**
     * Invites user to the channel
     * User can choose either to join or not
     */
    Members.prototype.invite = function(username)
    {
        return new Promise(function(resolve, reject) {

            this._session.addCommand('inviteMember', {channelSid: this._channelSid, username: username})
                .then(resolve)
                .catch(reject);

        }.bind(this));
    };

    /**
     * Remove user from channel
     */
    Members.prototype.remove = function(username)
    {
        return new Promise(function(resolve, reject) {

            this._session.addCommand('removeMember', {channelSid: this._channelSid, username: username})
                .then(resolve)
                .catch(reject);

        }.bind(this));
    };

    module.exports = Members;


},{"./member.js":61,"events":12,"loglevel":49,"util":47}],63:[function(require,module,exports){

    /**
     * Creates a channel message object instance
     *
     * @class Message
     * @classdesc Objects of that class represens a single message in channel
     */
    function Message(entityId, params)
    {
        Object.defineProperties(this, {
            _entityId: {value: entityId, writable: false},
            _sid: {value: params.sid, writable: false},
            _author: {value: params.author, writable: false},
            _timestamp: {value: params.timestamp, writable: false},
            _text: {value: params.text, writable: true},
        });
    }

    Message.prototype.setBody = function(body)
    {
        this._text = body;
    };

    Message.prototype.getBody = function()
    {
        return this._text;
    };

    Message.prototype.getAuthor = function()
    {
        return this._author;
    };

    Message.prototype.getTimestamp = function()
    {
        return this._timestamp;
    };

    Message.prototype.getId = function()
    {
        return this._sid;
    };

    module.exports = Message;


},{}],64:[function(require,module,exports){

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var log = require('loglevel');

    var Message = require('./message.js');

    /*
     * Creates an instance of messages collection
     *
     * @class Messages
     * @classdesc Represents the collection of messages in a channel
     */
    function Messages(datasync, session, channelSid, uri)
    {
        Object.defineProperties(this, {
            _datasync: { value: datasync, writable: false },
            _session: {value: session, writable: false},
            _channelSid: {value: channelSid, writable: false},
            _uri: {value: uri, writable: false},
            _messages: {value: [], writable: true},
        });

        EventEmitter.call(this);
    }
    inherits(Messages, EventEmitter);

    /**
     * @private
     */
    Messages.prototype._getEventStream = function()
    {
        if(!this._eventStreamPromise)
        {
            this._eventStreamPromise = new Promise(function(resolve, reject) {
                this._datasync.openEventStream(this._uri)
                    .then(function(eventStream) {

                        this._eventStream = eventStream;
                        eventStream.subscribe();
                        eventStream.on('entityAdded', function(entity, index) {

                            var value = entity.getValue();
                            var messageId = value.sid;
                            log.trace("Message added: " + messageId + " : " + JSON.stringify(value));

                            var message = new Message(entity.getEntityId(), entity.getValue());
                            this._messages.push(message);
                            this.emit('messageAdded', message);
                        }.bind(this));

                        eventStream.on('entityUpdated', function(entity, index) {

                            var message = this._getMessageByIndex(index);
                            if(message) {

                                var value = entity.getValue();
                                Object.defineProperties(message, {
                                    _entityId:  {value: index, writable: false},
                                    _sid:       {value: value.sid, writable: false},
                                    _author:    {value: value.author, writable: false},
                                    _timestamp: {value: value.timestamp, writable: false},
                                    _text:      {value: value.text, writable: true},
                                });

                                this.emit('messageUpdated', message);
                            }

                        }.bind(this));

                        eventStream.on('entityRemoved', function(index) {
                            var message = this._getMessageByIndex(index, true);
                            if(message) {
                                this.emit('messageRemoved', message.getId());
                            }
                        }.bind(this));

                        resolve(eventStream);

                    }.bind(this))
                    .catch(function(error) {
                        log.error("Failed to get messages: " + error);
                        reject("Can't get messages: " + error);
                    });
            }.bind(this));
        }

        return this._eventStreamPromise;
    };

    /**
     * @private
     */
    Messages.prototype._addToCache = function(messages)
    {
        if(!messages || messages.length ===0) { return; }

        if(this._messages === undefined || this._messages.length === 0)
        {
            this._messages = messages;
        }
        else
        {
            if(this._messages[0]._entityId > messages[messages.length-1]._entityId)
            {
                //this._messages.unshift(messages);
                this._messages = messages.concat(this._messages);
            }
            else if(this._messages[this._messages.length - 1]._entityId < messages[0]._entityId)
            {
                //this._messages.push.apply(this._messages, messages);
                this._messages = this._messages.concat(messages);
            }
        }
    };

    /**
     * @param {Number} entityId Entity id to match message
     * @param {Bool} remove Remove message if found
     * @returns Message from cache by id, or null, if not found
     * @private
     */
    Messages.prototype._getMessageByIndex = function(entityId, remove)
    {
        var result = null;
        this._messages.some(function(message, index) {
            if(message._entityId == entityId) {
                result = message;
                if(remove) {
                    this._messages.splice(index, 1);
                }
                return true;
            } else {
                return false;
            }
        }.bind(this));

        return result;
    };

    /**
     * Subscribe to the message list changes
     * @private
     */
    Messages.prototype._subscribe = function()
    {
        this._getEventStream()
            .then(function(eventStream) {
                eventStream.subscribe();
            });
    };

    /**
     * Unsubscribe from the message list changes
     * @private
     */
    Messages.prototype._unsubscribe = function()
    {
        if(this._eventStreamPromise) {
            this._eventStreamPromise.then(function(eventStream) {
                eventStream.unsubscribe();
            });
        }
    };

    /**
     * Send message to the channel
     * @param {String} message - Message to post
     * @returns Returns promise which can fail
     */
    Messages.prototype.send = function(message)
    {
        var self = this;
        var promise = new Promise(function(resolve, reject) {

            self._session.addCommand('sendMessage', {
                channelSid: self._channelSid,
                text: message,
            })
                .then(function(response) {
                    log.trace('Message posted: ', response);
                    resolve(response.messageId);
                }, function(reason) {
                    log.error("Can't post message: " + reason);
                    reject("Can't post message: " + reason);
                });
        });

        return promise;
    };

    /**
     * Returns last messages from channel
     *
     * @returns last page of messages by default
     *
     * @param {Number} messagesCount number of messages to return
     * @param {String} anchor Most early message id which is already known, or 'end'
     */
    Messages.prototype.getMessages = function(count, anchor)
    {
        var _anchor = (anchor !== undefined) ? anchor : 'end';
        var _count  = (count  !== undefined) ? count  : 10;

        if(_anchor !== 'end') { _count++; }

        log.trace("Getting messages for channel " + this._channelSid);

        if(this._messages && this._messages.length > 0 && _anchor == 'end')
        {
            return Promise.resolve(this._messages.slice(Math.max(0, this._messages.length-_count)));
        }

        if(_anchor !== 'end')
        {
            var result = this._messages.some(function(message) {
                if(message._sid === _anchor) {
                    _anchor = message._entityId;
                    return true;
                }
                return false;
            });

            if(!result) {
                Promise.reject(new Error("Unknown anchor"));
            }
        }

        var self = this;
        return new Promise(function(resolve, reject) {

            this._getEventStream()
                .then(function(messagesStream) {
                    messagesStream.queryEntitiesBefore(_anchor, _count)
                        .then(function(result) {
                            var messages = [];
                            result.forEach(function(messageEntity) {
                                var messageData = messageEntity.getValue();
                                var message = new Message(messageEntity.getEntityId(), messageData);
                                messages.push(message);
                            });

                            if(_anchor !== 'end') {
                                messages.pop();
                            }

                            self._addToCache(messages);
                            resolve(messages);
                        })
                        .catch(function(reason) {
                            reject(reason);
                        });

                })
                .catch(function(reason) {
                    reject(reason);
                });
        }.bind(this));
    };

    module.exports = Messages;


},{"./message.js":63,"events":12,"loglevel":49,"util":47}],65:[function(require,module,exports){

    var guid = require('../../util/guid');
    var log = require('loglevel');

    /**
     *  Constructs the instance of Session
     *
     *  @class Session
     *
     *  @classdesc Provides the interface to send the command to the server
     *  It is reliable, which means that it tracks the command object state
     *  and waits the answer from the server.
     */
    function Session(datasync, token)
    {
        Object.defineProperties(this, {
            _token:    {value: token, writable: true},
            _datasync: {value: datasync},
            _purpose:  {value: "com.twilio.rtd.ipmsg"},

            _commandQueue: { value: [] },
        });
    }

    Session.prototype.initialize = function()
    {
        var session = {
            type: 'channelSession',
            apiVersion: '1',
            endpointPlatform: 'channellib',
            capabilityToken: this._token,
        };

        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self._datasync.createEntity(session, true, self._purpose)
                .then(function(entity) {
                    log.debug("IPMSG: session created");

                    entity.subscribe();
                    self._sessionEntity = entity;

                    resolve();
                }, function(error) {
                    log.error("IPMSG: failed to create session");
                    reject("Failed to create ipmessagin session: " + error);
                });
        });

        return promise;
    };

    /**
     * Sends the command to the server
     * @returns Returns the promise, which is being fulfilled only when service will reply
     */
    Session.prototype.addCommand = function(action, params)
    {
        return new Promise(function(resolve, reject) {
            this._commandQueue.push({ action: action,
                params: params,
                resolve: resolve,
                reject: reject });

            this._wakeupQueue();
        }.bind(this));
    };

    /**
     * @private
     */
    Session.prototype._wakeupQueue = function()
    {
        if(!this._commandQueueIsActive && this._commandQueue.length > 0) {
            this._commandQueueIsActive = true;
            this._executeQueue();
        }
    };

    /**
     * @private
     */
    Session.prototype._executeQueue = function()
    {
        if(this._commandQueue.length === 0) {
            this._commandQueueIsActive = false;
            return;
        }

        setTimeout(function() {
            var command = this._commandQueue.shift();
            this._processCommand(command)
                .then(function(value) {
                    command.resolve(value);
                    this._executeQueue();
                }.bind(this))
                .catch(function(err) {
                    command.reject(err);
                    this._executeQueue();
                }.bind(this));
        }.bind(this), 0);
    };

    /**
     * @private
     */
    Session.prototype._processCommand = function(args)
    {
        var commandId = guid();
        var command = { request: args.params };
        command.request.action = args.action;

        var sessionData = this._sessionEntity.getData();
        sessionData = this._stripSession(sessionData);

        if(!sessionData.commands)
            sessionData.command = {};

        sessionData.commands[commandId] = command;

        this._sessionEntity.setData(sessionData);

        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self._sessionEntity.pushChanges(function conflictResolver(context) {
                // Just trying to add a command once more
                var data = context.remoteData;
                data.commands[commandId] = command;
                context.resolve(data);
            })
                .then(function(res) {
                    self._sessionEntity.addEventHandler('keyAdded', '/commands/'+commandId+'/response', function(value) {
                        if(value.status == 200) {
                            resolve(value);
                        }
                        else {
                            reject("Command answer code: " + value.status);
                        }
                    });

                }, function(err) {
                    reject(new Error("IPMSG E: can't add command: " + err));
                });
        });

        return promise;

    };

    /**
     * Removes processed commands from session
     */
    Session.prototype._stripSession = function(sessionData)
    {
        var commands = sessionData.commands;
        for(var command in commands) {
            if(commands[command].hasOwnProperty('response')) {
                delete commands[command];
            }
        }

        return sessionData;
    };

    Session.prototype.updateToken = function(token)
    {
        this._sessionEntity.update('/token', token);
        this._sessionEntity.pushChanges();
    };

    Session.prototype.value = function(path)
    {
        return this._sessionEntity.value(path);
    };

    Session.prototype.onKeyUpdated = function(path, handler)
    {
        this._sessionEntity.addEventHandler('keyAdded', path, handler);
        this._sessionEntity.addEventHandler('keyUpdated', path, handler);
    };

    module.exports = Session;



},{"../../util/guid":72,"loglevel":49}],66:[function(require,module,exports){
    'use strict';

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var request = require('../../util/request');
    var log = require('loglevel');

    var NotificationConfig = require('./configuration');
    var TwilsockClient = require('./twilsock');
    var Registrar = require('./registrar');
    var RegistrarClient = require('./registrar.connector');

    /**
     * Creates the instance of Notification helper library
     * @param {string} token - Twilio token
     *
     * @class NotificationClient
     * @classdesc The helper library for the notification service.
     * Provides high level api for creating and managing notification subscriptions and receiving messages
     */
    function NotificationClient(token) {

        if(!token) {
            throw new Error("Token is required for Notification client");
        }

        EventEmitter.call(this);

        this._reliableTransportState = {
            overall: false,
            transport: false,
            registration: false,
        };

        this._config = new NotificationConfig(token);

        this._registrar = new Registrar(this._config);
        this._registrar.on('stateChanged', function(state) { this._onRegistrationStateChange(state); }.bind(this));

        this._twilsock = new TwilsockClient(this._config);

        this._twilsock.on('message', this._routeMessage.bind(this));

        this._twilsock.on('connected', function(notificationId) {
            this._onTransportStateChange(true);
            this._registrar.setNotificationId('twilsock', notificationId);
        }.bind(this));

        this._twilsock.on('disconnected', function() { this._onTransportStateChange(false); }.bind(this));

        this._twilsock.connect();
    }

    inherits(NotificationClient, EventEmitter);

    /**
     *  Routes messages to the external subscribers
     */
    NotificationClient.prototype._routeMessage = function(type, message)
    {
        log.trace("Message arrived: " + type + " " + message);
        this.emit('message', type, message);
    };

    NotificationClient.prototype._onRegistrationStateChange = function(state)
    {
        this._reliableTransportState.registration = (state === 'registered');
        this._updateTransportState();
    };

    NotificationClient.prototype._onTransportStateChange = function(connected)
    {
        this._reliableTransportState.transport = connected;
        this._updateTransportState();
    };

    NotificationClient.prototype._updateTransportState = function()
    {
        var overallState = this._reliableTransportState.transport && this._reliableTransportState.registration;

        if(this._reliableTransportState.overall !== overallState)
        {
            this._reliableTransportState.overall = overallState;

            log.info('NTFCN I: Transport ready ' + overallState);
            this.emit('transport_ready', overallState);
        }
    };

    /**
     *  Adds the subscription for the given message type
     *  @param {string} message_type The type of message that you want to receive
     *  @param {string} Channel type. Supported are 'twilsock' and 'gcm'
     */
    NotificationClient.prototype.subscribe = function(message_type, channel_type)
    {
        log.trace("Add subscriptions for event type: " + JSON.stringify(message_type));

        if(!channel_type) {
            channel_type = 'twilsock';
        }

        return this._registrar.subscribe(message_type, channel_type);
    };

    /**
     *  Remove the subscription for the particular message type
     *  @param {string} message_type The type of message that you don't want to receive anymore
     *  @param {string} Channel type. Supported are 'twilsock' and 'gcm'
     */
    NotificationClient.prototype.unsubscribe = function(message_type, channel_type)
    {
        return this._registrar.unsubscribe(message_type, channel_type);
    };

    /**
     *  Handle incoming push notification.
     *  Client application should call this method when it receives push notifications and pass the received data
     */
    NotificationClient.prototype.handlePushNotification = function(msg)
    {
        log.warn("Push message passed, but no functionality implemented yet: " + JSON.stringify(msg));
    };

    /**
     *  Set GCM token to enable application register for a push messages
     *  @param {string} gcmToken Token received from GCM system
     */
    NotificationClient.prototype.setGCMToken = function(gcmToken)
    {
        this._registrar.setNotificationId('gcm', gcmToken);
    };

    /**
     * Set authentication token
     * If token is already set, it will be replaced with the new one
     *
     * @param {String} Authentication token
     */
    NotificationClient.prototype.setAuthToken = function(authToken)
    {
        log.info("NTFCN I: authTokenUpdated");
        this._config.updateToken(authToken);

        this._registrar._updateGcmRegistration();

        this._twilsock.disconnect()
            .then(this._twilsock.connect.bind(this._twilsock));
        // Reconnection of twilsock automatically triggers re-registration
    };

    module.exports = NotificationClient;


},{"../../util/request":74,"./configuration":67,"./registrar":69,"./registrar.connector":68,"./twilsock":70,"events":12,"loglevel":49,"util":47}],67:[function(require,module,exports){
    'use strict';

    /**
     * Notification library configuration provider
     */
    function NotificationConfig(token)
    {
        Object.defineProperties(this, {
            _registrarUri: {value: "https://ers.us1.twilio.com" + "/v1/registrations" },
            _twilsockWsHost: {value: "wss://tsock.us1.twilio.com" + "/v1/wschannels" },
            _token: {value: token, writable: true}
        });

        this.getRegistrarUri = function() {
            return this._registrarUri;
        };

        this.getTwilsockUri = function() {
            return this._twilsockWsHost;
        };

        this.getToken = function() {
            return this._token;
        };
    }

    NotificationConfig.prototype.updateToken = function(token)
    {
        this._token = token;
    };

    module.exports = NotificationConfig;


},{}],68:[function(require,module,exports){
    'use strict';

    var request = require('../../util/request');
    var log = require('loglevel');

    /**
     * Creates new instance of the ERS registrar
     *
     * @class RegistrarClient
     * @classdesc Manages the registrations on ERS service.
     * It deduplicates registrations and manages them automatically
     */
    function RegistrarClient(conf, notificationId, channel_type, message_types)
    {
        Object.defineProperties(this, {
            conf: {value: conf},
            url: {value: conf.getRegistrarUri(), writable: false},
            token: {value: conf.getToken() },
            notificationId: {value: notificationId},
            channel_type: {value: channel_type},
            message_types: {value: message_types},
            platform: {value: typeof navigator !== 'undefined' ? navigator.userAgent : 'web'},
            state: {value: 'unregistered'},
        });

    }

    /**
     * Enables the registration
     */
    RegistrarClient.prototype.register = function()
    {
        var self = this;

        var registrarRequest = {
            'endpoint_platform': this.platform,
            'channel_type': this.channel_type,
            'version':'1',
            'message_types': this.message_types,
            'data':{
                //    'url': this.notificationId
            },
            'ttl':'PT24H'
        };

        if(this.channel_type === 'twilsock') {
            registrarRequest.data.url = this.notificationId;
        }
        else {
            registrarRequest.data.registration_id = this.notificationId;
        }

        var requestParams = {
            url: this.url,
            body: registrarRequest,
            headers: {
                'Content-Type': 'application/json',
                'X-Twilio-Token': this.token,
            }
        };

        this._setState('registering');
        var promise = new Promise(function(resolve, reject) {
            log.trace('NTFCN I: Creating registration for channel ' + self.channel_type);
            request.post(requestParams)
                .then(function(res) {
                    var parsedResponse = JSON.parse(res);
                    self.registrationId = parsedResponse.id;
                    log.debug("NTFCN I: Registration created: " + res);
                    self._setState('registered');
                    resolve(res);
                }, function(res) {
                    log.error("NTFCN E: Registration failed: " + res);
                    self._setState('unregistered');
                    reject(res);
                });
        });

        return promise;
    };

    /**
     * Remove registration from server
     */
    RegistrarClient.prototype.unregister = function()
    {
        this._setState('unregistering');

        var self = this;
        var promise = new Promise(function(resolve, reject) {

            if(!self.registrationId)
            {
                resolve();
                return promise;
            }

            var registrarRequest = '';

            var requestParams = {
                url: self.url + "/" + self.registrationId,
                body: registrarRequest,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Twilio-Token': self.token,
                }
            };

            log.trace('NTFCN I: removing registration for ' + self.channel_type);
            request('DELETE', requestParams)
                .then(function(res) {
                    log.debug("NTFCN I: removed " + self.channel_type + " registration");
                    self._setState('unregistered');
                    resolve();
                }, function(reason) {
                    // failure to remove registration since being treated as "unregistered" state
                    // because it is indicates that something wrong with server/connection
                    log.error("NTFCN E: failed to remove of registration " + self.channel.type);
                    log.error(reason);
                    self._setState('unregistered');
                    reject(reason);
                });
        });

        return promise;
    };

    RegistrarClient.prototype.getState = function()
    {
        return this._state;
    };

    RegistrarClient.prototype._setState = function(state)
    {
        this._state = state;
    };

    module.exports = RegistrarClient;


},{"../../util/request":74,"loglevel":49}],69:[function(require,module,exports){
    'use strict';

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var log = require('loglevel');

    var RegistrarClient = require('./registrar.connector');

    /**
     * @param {string} Message type
     * @returns Returns the new subscriptions descriptor
     *
     * @class Subscription
     * @classdesc Container for subscription data
     */
    function Subscription(message_type, channel_type, subscription_id)
    {
        this.message_type = message_type;
        this.channel_type = channel_type;
        this.subscription_id = subscription_id;

        return this;
    }

    /**
     * Creates the new instance of ERS registrar client
     *
     * @class Registrar
     * @classdesc Provides an interface to the ERS registrar
     */
    function Registrar(conf)
    {
        this._conf = conf;
        this._subscriptions = {
            twilsock: [],
            gcm: [],
        };

        this._notificationIds = {
            twilsock: null,
            gcm: null,
        };
    }
    inherits(Registrar, EventEmitter);

    /**
     *  Sets notification ID.
     *  If new URI is different from previous, it triggers updating of registration for given channel
     *
     *  @param {string} uri The notification ID
     */
    Registrar.prototype.setNotificationId = function(channel_type, notificationId)
    {
        log.trace("NTFCN I: Notification id for channel " + channel_type + " set " + notificationId);
        if(this._notificationIds[channel_type] !== notificationId)
        {
            this._notificationIds[channel_type] = notificationId;
            this._updateRegistration(channel_type);
        }
    };

    /**
     *  Updates the subscriptions list
     *  Should be called after reliable transport reconnect
     */
    Registrar.prototype.refreshSubscriptions = function()
    {
        log.info("NTFCN: Refresh registrations");
        this._updateTwilsockRegistration();
    };

    /**
     *  Checks if subscription for given message and channel already exists
     */
    Registrar.prototype.hasSubscription = function(message_type, channel_type)
    {
        var result = false;
        if(channel_type === 'twilsock') {
            this._subscriptions.twilsock.forEach(function(el) {
                if(el.message_type === message_type)
                    result = true;
            });
        }
        else if(channel_type === 'gcm') {
            this._subscriptions.gcm.forEach(function(el) {
                if(el.message_type === message_type)
                    result = true;
            });
        }
        else {
            throw new Error("Unknown channel type: " + channel_type);
        }

        return result;
    };

    /**
     *  Subscribe for given type of message
     *
     * @param {String} message_type Message type identifier
     * @param {String} channel_type Channel type, can be 'twilsock' or 'gcm'
     * @param {String} subscription_id
     */
    Registrar.prototype.subscribe = function(message_type, channel_type, subscription_id)
    {
        if(this.hasSubscription(message_type, channel_type))
            return;

        var subscription = new Subscription(message_type, channel_type, subscription_id);

        if(channel_type === 'twilsock') {
            this._subscriptions.twilsock.push(subscription);
            this._updateTwilsockRegistration();
        }
        else if(channel_type === 'gcm') {
            this._subscriptions.gcm.push(subscription);
            this._updateGcmRegistration();
        }
        else {
            throw new Error("Can't subscribe to the channel type " + channel_type);
        }
    };

    /**
     *  Remove subscription
     */
    Registrar.prototype.unsubscribe = function(message_type, channel_type)
    {
        var subscription_found = false;
        for(var idx = 0; idx < this.subscriptions.length; ++idx)
        {
            log.trace("Message type: " + message_type + " == " + this.subscriptions[idx].message_type);

            var subscription = this.subscriptions[idx];
            if(subscription.message_type == message_type && subscription.channel_type == channel_type)
            {
                this.subscriptions.splice(idx, 1);
                subscription_found = true;
                break;
            }
        }

        if(subscription_found)
        {
            this._refreshSubscriptions();
        }

    };

    /**
     *  Update all registrations for channel type
     */
    Registrar.prototype._updateRegistration = function(channel_type)
    {
        if(channel_type === 'twilsock') {
            return this._updateTwilsockRegistration();
        } else if(channel_type === 'gcm') {
            return this._updateGcmRegistration();
        }
    };

    /**
     *  Updates registration for the GCM channel
     *  @private
     */
    Registrar.prototype._updateTwilsockRegistration = function()
    {
        if(!this._notificationIds.twilsock) {
            log.trace("Ignoring twilsock registration update request: no twilsock id in place");
            return; // Can't make twilsock registration without transport url
        }

        log.debug("Updating twilsock registration");

        var notificationId = this._notificationIds.twilsock;
        var channelType   = 'twilsock';

        var activeSubscriptions = [];
        this._subscriptions.twilsock.forEach(function(element, index) {
            activeSubscriptions.push(element.message_type);
        });

        if(this.twilsockRegistrarClient)
        {
            if(this.twilsockRegistrarClient.getState() === 'registered')
            {
                log.debug("Twilsock registrar is already in place, restarting");
                this.twilsockRegistrarClient.unregister()
                    .then(function() {
                        delete this.twilsockRegistrarClient;
                        this._updateTwilsockRegistration();
                    }.bind(this));
            }

            return;
        }

        if(activeSubscriptions.length > 0)
        {
            log.debug("Subscribing to the twilsock notifications");
            this.twilsockRegistrarClient = new RegistrarClient(this._conf, notificationId, channelType, activeSubscriptions);
            this.twilsockRegistrarClient.register()
                .then(function(res)
                {
                    try
                    {
                        var response = JSON.parse(res);
                        log.debug("subscription id: " + response.id);
                        this.emit('stateChanged', 'registered');
                    }
                    catch(e)
                    {
                        log.error("ERROR: malformed response from ERS: " + res);
                        this.emit('stateChanged', 'unregistered');
                    }
                }.bind(this))
                .catch(function(err) {
                    log.error("NTFCN E: failed to register", err);
                });
        }
    };

    /**
     *  Updates registration for the GCM channel
     *  @private
     */
    Registrar.prototype._updateGcmRegistration = function()
    {
        if(!this._notificationIds.gcm)
            return; // Can't make gcm registration without transport url

        var notificationId = this._notificationIds.gcm;
        var channelType   = 'gcm';

        var activeSubscriptions = [];
        this._subscriptions.gcm.forEach(function(element, index) {
            activeSubscriptions.push(element.message_type);
        });

        if(this.gcmRegistrarClient)
        {
            this.gcmRegistrarClient.unregister()
                .then(function() {
                    this._updateGcmRegistration();
                }.bind(this));

            this.gcmRegistarClient = undefined;
            return;
        }

        if(activeSubscriptions.length > 0)
        {
            log.debug("Subscribing to the gcm notifications");
            this.pushRegistrarClient = new RegistrarClient(this._conf, notificationId.subscriptionId, channelType, activeSubscriptions);
            this.pushRegistrarClient.register()
                .then(function(res)
                {
                    var response = JSON.parse(res);
                    log.debug("subscription id: " + response.id);
                }.bind(this))
                .catch(function(err) {
                    log.error("Failed to register for GCM notifications: ", reason);
                }.bind(this));
        }
    };

    module.exports = Registrar;


},{"./registrar.connector":68,"events":12,"loglevel":49,"util":47}],70:[function(require,module,exports){
    'use strict';

    var EventEmitter = require('events').EventEmitter;
    var inherits = require('util').inherits;
    var log = require('loglevel');

    var StateMachine = require("javascript-state-machine");

    function TwilsockClient(config)
    {
        Object.defineProperties(this, {
            _config: { value: config },
            _transportReady: { value: false, writable: true },
        });

        this._disconnectedPromiseResolve = null;

        this._fsm = StateMachine.create({
            initial: 'disconnected',
            events: [
                { name: 'userConnect',      from: ['disconnected'],                           to: 'connecting'   },
                { name: 'userDisconnect',   from: ['connecting', 'connected', 'retrying'],    to: 'disconnecting'},
                { name: 'userRetry',        from: ['retrying'],                               to: 'connecting'   },
                { name: 'socketConnected',  from: ['connecting'],                             to: 'connected'    },
                { name: 'socketClosed',     from: ['connecting', 'connected'],                to: 'retrying'     },
                { name: 'socketClosed',     from: ['disconnecting'],                          to: 'disconnected' },
            ],
            callbacks: {
                onconnecting:      this._setupSocket.bind(this),
                onretrying:        this._retry.bind(this),
                onenterconnected:  this._onTransportReady.bind(this, true),
                onleaveconnected:  this._onTransportReady.bind(this, false),
                onuserDisconnect:  this._closeSocket.bind(this),

                ondisconnected:    function() {
                    if(this._disconnectedPromiseResolve) {
                        var resolve = this._disconnectedPromiseResolve;
                        this._disconnectedPromiseResolve = null;
                        resolve();
                    }
                }.bind(this),
            },
        });
    }

    inherits(TwilsockClient, EventEmitter);

    TwilsockClient.prototype._retry = function()
    {
        delete this._socket;
        this._retryTimeout = setTimeout(function() {
            this._fsm.userRetry();
        }.bind(this), 1000);
    };

    TwilsockClient.prototype._onConnected = function()
    {
        this._onTransportReady(true);
    };

    TwilsockClient.prototype._onDisconnected = function()
    {
        this._onTransportReady(false);
    };

    TwilsockClient.prototype._setupSocket = function()
    {
        var self = this;
        var uri = this._config.getTwilsockUri() + '?token=' + this._config.getToken();
        var socket = new WebSocket(uri);

        socket.onopen = function (par) {
            log.info("NTFCN I: Twilsock socket opened");
        };

        socket.onclose = function (par) {
            log.info("NTFCN I: socket closed");
            self._fsm.socketClosed();
        };

        socket.onerror = function (error) {
            log.error('NTFCN E: ', error);
            //self._fsm.socketError();
        };

        // Log messages from the server
        socket.onmessage = function (message) {
            log.trace('NTFCN: twilsock: ' + message.data);

            if(message.data === ' ') {
                // keep alive
                log.trace('NTFCN: keep alive received');
                return;
            }

            var index = message.data.indexOf('|');
            var msg = message.data.substring(index+1);

            var json;
            try {
                json = JSON.parse(msg);
            } catch (e) {
                log.error('This doesn\'t look like a valid JSON: ', msg.data);
                return;
            }

            if(json.hasOwnProperty('event_type'))
            {
                log.trace(json.event_type + ' :: ' + json.payload);

                // it's ws.onReady or even something worse
                var payload = json.payload;

                self._wschannel_url = payload.wschannel_url;
                self._fsm.socketConnected();
            }
            else
            {
                self.emit('message', json.type, json.data);
            }
        };

        this._socket = socket;
    };

    /**
     * Cancels pending retry attempt if it exists
     * @private
     */
    TwilsockClient.prototype._cancelRetryAttempt = function()
    {
        if(this._retryTimeout) {
            clearTimeout(this._retryTimeout);
            delete this._retryTimeout;
        }
    };

    /**
     * Shutdown connection
     * @private
     */
    TwilsockClient.prototype._closeSocket = function()
    {
        this._cancelRetryAttempt();

        if(this._socket) {
            this._socket.close();
        }
    };

    /**
     * Initiate the twilsock connection
     * If already connected, it does nothing
     */
    TwilsockClient.prototype.connect = function()
    {
        this._fsm.userConnect();
    };

    /**
     * Close twilsock connection
     * If already disconnected, it does nothing
     */
    TwilsockClient.prototype.disconnect = function()
    {
        if(this._fsm.is('disconnected')) {
            return Promise.resolve();
        } else {
            return new Promise(function(resolve) {
                this._fsm.userDisconnect();
                this._disconnectedPromiseResolve = resolve;
            }.bind(this));
        }
    };

    /**
     *  Notify client that transport is ready
     */
    TwilsockClient.prototype._onTransportReady = function(state) {
        if(this._transportReady != state)
        {
            this._transportReady = state;

            if(this._transportReady === true) {
                log.trace("Twilsock connected: " + this._wschannel_url);
                this._state = "connected";
                this.emit('connected', this._wschannel_url);
            }
            else {
                log.trace("Twilsock disconnected");
                this._wschannel_url = null;
                this._state = "disconnected";
                this.emit('disconnected');
            }
        }
    };


    module.exports = TwilsockClient;



},{"events":12,"javascript-state-machine":75,"loglevel":49,"util":47}],71:[function(require,module,exports){
    'use strict';

    function IPMessaging(token, notificationClient, dataSyncClient) {
        return new IPMessaging.Client(token, notificationClient, dataSyncClient);
    }

    IPMessaging.Client = require('./clients/ipmessaging/client');
    IPMessaging.NotificationClient = require('./clients/notification/client');
    IPMessaging.DataSyncClient = require('./clients/datasync/client');

    module.exports = IPMessaging;

},{"./clients/datasync/client":50,"./clients/ipmessaging/client":60,"./clients/notification/client":66}],72:[function(require,module,exports){

    function guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        /*
         return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
         */
        return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
    }

    module.exports = guid;


},{}],73:[function(require,module,exports){
    'use strict';

    /**
     * We're using that wersion of JSONdiff instead of vanilla one
     * since vanilla has the bug in path calculation and maintaner doesn't accept the patch.
     *
     * Should return to the using of original module when situation will change
     */

    function JsonDiff() {
        ;
    }

    JsonDiff.prototype.toString = Object.prototype.toString;

    JsonDiff.prototype.hasOwnProperty = Object.prototype.hasOwnProperty;

    JsonDiff.prototype.isArray = function(obj) {
        return this.toString.call(obj) === '[object Array]';
    };

    JsonDiff.prototype.isObject = function(obj) {
        return this.toString.call(obj) === '[object Object]';
    };

    JsonDiff.prototype.isString = function(obj) {
        return this.toString.call(obj) === '[object String]';
    };

    JsonDiff.prototype.isFunction = function(obj) {
        return this.toString.call(obj) === '[object Function]';
    };

    JsonDiff.prototype.has = function(obj, key) {
        return hasOwnProperty.call(obj, key);
    };

    JsonDiff.prototype.isEqual = function(a, b) {
        return this.eq(a, b, [], []);
    };

    JsonDiff.prototype.isContainer = function(obj) {
        return this.isArray(obj) || isObject(obj);
    };

    JsonDiff.prototype.isSameContainer = function(obj1, obj2) {
        return (this.isArray(obj1) && this.isArray(obj2)) || (this.isObject(obj1) && this.isObject(obj2));
    };

    JsonDiff.prototype.eq = function(a, b, aStack, bStack) {
        var aCtor, bCtor, className, key, length, result, size;
        if (a === b) {
            return a !== 0 || 1 / a === 1 / b;
        }
        if (!(a != null) || !(b != null)) {
            return a === b;
        }
        className = this.toString.call(a);
        if (className !== this.toString.call(b)) {
            return false;
        }
        switch (className) {
            case "[object String]":
                return a === String(b);
            case "[object Number]":
                return (a !== +a ? b !== +b : (a === 0 ? 1 / a === 1 / b : a === +b));
            case "[object Date]":
            case "[object Boolean]":
                return +a === +b;
            case "[object RegExp]":
                return a.source === b.source && a.global === b.global && a.multiline === b.multiline && a.ignoreCase === b.ignoreCase;
        }
        if (typeof a !== "object" || typeof b !== "object") {
            return false;
        }
        length = aStack.length;
        if ((function() {
                var _results;
                _results = [];
                while (length--) {
                    _results.push(aStack[length] === a);
                }
                return _results;
            })()) {
            return bStack[length] === b;
        }
        aStack.push(a);
        bStack.push(b);
        size = 0;
        result = true;
        if (className === "[object Array]") {
            size = a.length;
            result = size === b.length;
            if (result) {
                while (size--) {
                    if (!(result = this.eq(a[size], b[size], aStack, bStack))) {
                        break;
                    }
                }
            }
        } else {
            aCtor = a.constructor;
            bCtor = b.constructor;
            if (aCtor !== bCtor && !(this.isFunction(aCtor) && (aCtor instanceof aCtor) && this.isFunction(bCtor) && (bCtor instanceof bCtor))) {
                return false;
            }
            for (key in a) {
                if (this.has(a, key)) {
                    size++;
                    if (!(result = this.has(b, key) && this.eq(a[key], b[key], aStack, bStack))) {
                        break;
                    }
                }
            }
            if (result) {
                for (key in b) {
                    if (this.has(b, key) && !(size--)) {
                        break;
                    }
                }
                result = !size;
            }
        }
        aStack.pop();
        bStack.pop();
        return result;
    };

    JsonDiff.prototype.getParent = function(paths, path) {
        var path = path.replace(/\/[^\/]*$/, '');
        if(!path)
            path = '/';
        return paths[path];
    };

    JsonDiff.prototype.flattenObject = function(obj, prefix, paths) {
        var i, key, o, _i, _len;
        if (prefix == null) {
            prefix = "/";
        }
        if (paths == null) {
            paths = {};
        }
        paths[prefix] = {
            path: prefix,
            value: obj
        };
        if (prefix !== '/') {
            prefix = prefix + '/';
        }
        if (this.isArray(obj)) {
            for (i = _i = 0, _len = obj.length; _i < _len; i = ++_i) {
                o = obj[i];
                this.flattenObject(o, prefix + i, paths);
            }
        } else if (this.isObject(obj)) {
            for (key in obj) {
                o = obj[key];
                this.flattenObject(o, prefix + key, paths);
            }
        }
        return paths;
    };

    JsonDiff.prototype.diff = function(obj1, obj2) {
        var add, doc, doc1, doc2, key, key1, key2, keyfrom, keyto, move, patch, paths1, paths2, remove, replace;
        if (!this.isSameContainer(obj1, obj2)) {
            throw new Error('Patches can only be derived from objects or arrays');
        }
        paths1 = this.flattenObject(obj1);
        paths2 = this.flattenObject(obj2);
        add = {};
        remove = {};
        replace = {};
        move = {};
        for (key in paths1) {
            doc1 = paths1[key];
            doc2 = paths2[key];
            if (!this.getParent(paths2, key)) {
                continue;
            } else if (!doc2) {
                remove[key] = doc1;
            } else if (this.isSameContainer(doc1.value, doc2.value)) {
                continue;
            } else if (!this.isEqual(doc1.value, doc2.value)) {
                replace[key] = doc2;
            }
        }
        for (key in paths2) {
            doc1 = paths1[key];
            doc2 = paths2[key];
            if (!doc1 && this.isSameContainer(this.getParent(paths1, key), this.getParent(paths2, key))) {
                add[key] = doc2;
            }
        }
        for (key1 in remove) {
            doc1 = remove[key1];
            for (key2 in add) {
                doc2 = add[key2];
                if (this.isEqual(doc2.value, doc1.value)) {
                    delete remove[key1];
                    delete add[key2];
                    move[key2] = key1;
                    break;
                }
            }
        }
        patch = [];
        for (key in add) {
            doc = add[key];
            patch.push({
                op: 'add',
                path: key,
                value: doc.value
            });
        }
        for (key in remove) {
            patch.push({
                op: 'remove',
                path: key
            });
        }
        for (key in replace) {
            doc = replace[key];
            patch.push({
                op: 'replace',
                path: key,
                value: doc.value
            });
        }
        for (keyto in move) {
            keyfrom = move[keyto];
            patch.push({
                op: 'move',
                from: keyfrom,
                path: keyto
            });
        }
        return patch;
    };

    JsonDiff.diff = function(o1, o2)
    {
        var diff = new JsonDiff();
        return diff.diff(o1, o2);
    };

    JsonDiff.isDeepEqual = function(o1, o2)
    {
        return (this.diff(o1, o2).length === 0);
    };

    module.exports = JsonDiff;


},{}],74:[function(require,module,exports){
    'use strict';

    var XHR = typeof XMLHttpRequest === 'undefined'
        ? require('xmlhttprequest').XMLHttpRequest
        : XMLHttpRequest;

    function request(method, params) {
        var promise = new Promise(function(resolve, reject) {

            var xhr = new XHR();
            xhr.open(method, params.url, true);

            xhr.onreadystatechange = function onreadystatechange() {
                if (xhr.readyState !== 4) { return; }

                if (200 <= xhr.status && xhr.status < 300) {
                    if(params.expectResponseHeaders) {
                        var headers = {
                            ETag: xhr.getResponseHeader('ETag'),
                            Location: xhr.getResponseHeader('Location'),
                        };

                        resolve({status: xhr.status, headers: headers, body: xhr.responseText});
                    }
                    else {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject({status: xhr.status, description: xhr.responseText});
                }
            };

            for(var headerName in params.headers) {
                xhr.setRequestHeader(headerName, params.headers[headerName]);
            }

            xhr.send(JSON.stringify(params.body));
        });

        return promise;
    }

    /**
     * Use XMLHttpRequest to get a network resource.
     * @param {String} method - HTTP Method
     * @param {Object} params - Request parameters
     * @param {String} params.url - URL of the resource
     * @param {Array}  params.headers - An array of headers to pass [{ headerName : headerBody }]
     * @param {Object} params.body - A JSON body to send to the resource
     * @returns {Promise}
     **/
    var Request = request;

    /**
     * Sugar function for request('GET', params);
     * @param {Object} params - Request parameters
     * @returns {Promise}
     */
    Request.get = function(params) {
        return request('GET', params);
    };

    /**
     * Sugar function for request('POST', params);
     * @param {Object} params - Request parameters
     * @returns {Promise}
     */
    Request.post = function(params) {
        return request('POST', params);
    };

    module.exports = Request;


},{"xmlhttprequest":76}],75:[function(require,module,exports){
    /*

     Javascript State Machine Library - https://github.com/jakesgordon/javascript-state-machine

     Copyright (c) 2012, 2013, 2014, 2015, Jake Gordon and contributors
     Released under the MIT license - https://github.com/jakesgordon/javascript-state-machine/blob/master/LICENSE

     */

    (function () {

        var StateMachine = {

            //---------------------------------------------------------------------------

            VERSION: "2.3.5",

            //---------------------------------------------------------------------------

            Result: {
                SUCCEEDED:    1, // the event transitioned successfully from one state to another
                NOTRANSITION: 2, // the event was successfull but no state transition was necessary
                CANCELLED:    3, // the event was cancelled by the caller in a beforeEvent callback
                PENDING:      4  // the event is asynchronous and the caller is in control of when the transition occurs
            },

            Error: {
                INVALID_TRANSITION: 100, // caller tried to fire an event that was innapropriate in the current state
                PENDING_TRANSITION: 200, // caller tried to fire an event while an async transition was still pending
                INVALID_CALLBACK:   300 // caller provided callback function threw an exception
            },

            WILDCARD: '*',
            ASYNC: 'async',

            //---------------------------------------------------------------------------

            create: function(cfg, target) {

                var initial      = (typeof cfg.initial == 'string') ? { state: cfg.initial } : cfg.initial; // allow for a simple string, or an object with { state: 'foo', event: 'setup', defer: true|false }
                var terminal     = cfg.terminal || cfg['final'];
                var fsm          = target || cfg.target  || {};
                var events       = cfg.events || [];
                var callbacks    = cfg.callbacks || {};
                var map          = {}; // track state transitions allowed for an event { event: { from: [ to ] } }
                var transitions  = {}; // track events allowed from a state            { state: [ event ] }

                var add = function(e) {
                    var from = (e.from instanceof Array) ? e.from : (e.from ? [e.from] : [StateMachine.WILDCARD]); // allow 'wildcard' transition if 'from' is not specified
                    map[e.name] = map[e.name] || {};
                    for (var n = 0 ; n < from.length ; n++) {
                        transitions[from[n]] = transitions[from[n]] || [];
                        transitions[from[n]].push(e.name);

                        map[e.name][from[n]] = e.to || from[n]; // allow no-op transition if 'to' is not specified
                    }
                };

                if (initial) {
                    initial.event = initial.event || 'startup';
                    add({ name: initial.event, from: 'none', to: initial.state });
                }

                for(var n = 0 ; n < events.length ; n++)
                    add(events[n]);

                for(var name in map) {
                    if (map.hasOwnProperty(name))
                        fsm[name] = StateMachine.buildEvent(name, map[name]);
                }

                for(var name in callbacks) {
                    if (callbacks.hasOwnProperty(name))
                        fsm[name] = callbacks[name]
                }

                fsm.current     = 'none';
                fsm.is          = function(state) { return (state instanceof Array) ? (state.indexOf(this.current) >= 0) : (this.current === state); };
                fsm.can         = function(event) { return !this.transition && (map[event].hasOwnProperty(this.current) || map[event].hasOwnProperty(StateMachine.WILDCARD)); }
                fsm.cannot      = function(event) { return !this.can(event); };
                fsm.transitions = function()      { return transitions[this.current]; };
                fsm.isFinished  = function()      { return this.is(terminal); };
                fsm.error       = cfg.error || function(name, from, to, args, error, msg, e) { throw e || msg; }; // default behavior when something unexpected happens is to throw an exception, but caller can override this behavior if desired (see github issue #3 and #17)

                if (initial && !initial.defer)
                    fsm[initial.event]();

                return fsm;

            },

            //===========================================================================

            doCallback: function(fsm, func, name, from, to, args) {
                if (func) {
                    try {
                        return func.apply(fsm, [name, from, to].concat(args));
                    }
                    catch(e) {
                        return fsm.error(name, from, to, args, StateMachine.Error.INVALID_CALLBACK, "an exception occurred in a caller-provided callback function", e);
                    }
                }
            },

            beforeAnyEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbeforeevent'],                       name, from, to, args); },
            afterAnyEvent:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafterevent'] || fsm['onevent'],      name, from, to, args); },
            leaveAnyState:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleavestate'],                        name, from, to, args); },
            enterAnyState:   function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenterstate'] || fsm['onstate'],      name, from, to, args); },
            changeState:     function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onchangestate'],                       name, from, to, args); },

            beforeThisEvent: function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onbefore' + name],                     name, from, to, args); },
            afterThisEvent:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onafter'  + name] || fsm['on' + name], name, from, to, args); },
            leaveThisState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onleave'  + from],                     name, from, to, args); },
            enterThisState:  function(fsm, name, from, to, args) { return StateMachine.doCallback(fsm, fsm['onenter'  + to]   || fsm['on' + to],   name, from, to, args); },

            beforeEvent: function(fsm, name, from, to, args) {
                if ((false === StateMachine.beforeThisEvent(fsm, name, from, to, args)) ||
                    (false === StateMachine.beforeAnyEvent( fsm, name, from, to, args)))
                    return false;
            },

            afterEvent: function(fsm, name, from, to, args) {
                StateMachine.afterThisEvent(fsm, name, from, to, args);
                StateMachine.afterAnyEvent( fsm, name, from, to, args);
            },

            leaveState: function(fsm, name, from, to, args) {
                var specific = StateMachine.leaveThisState(fsm, name, from, to, args),
                    general  = StateMachine.leaveAnyState( fsm, name, from, to, args);
                if ((false === specific) || (false === general))
                    return false;
                else if ((StateMachine.ASYNC === specific) || (StateMachine.ASYNC === general))
                    return StateMachine.ASYNC;
            },

            enterState: function(fsm, name, from, to, args) {
                StateMachine.enterThisState(fsm, name, from, to, args);
                StateMachine.enterAnyState( fsm, name, from, to, args);
            },

            //===========================================================================

            buildEvent: function(name, map) {
                return function() {

                    var from  = this.current;
                    var to    = map[from] || map[StateMachine.WILDCARD] || from;
                    var args  = Array.prototype.slice.call(arguments); // turn arguments into pure array

                    if (this.transition)
                        return this.error(name, from, to, args, StateMachine.Error.PENDING_TRANSITION, "event " + name + " inappropriate because previous transition did not complete");

                    if (this.cannot(name))
                        return this.error(name, from, to, args, StateMachine.Error.INVALID_TRANSITION, "event " + name + " inappropriate in current state " + this.current);

                    if (false === StateMachine.beforeEvent(this, name, from, to, args))
                        return StateMachine.Result.CANCELLED;

                    if (from === to) {
                        StateMachine.afterEvent(this, name, from, to, args);
                        return StateMachine.Result.NOTRANSITION;
                    }

                    // prepare a transition method for use EITHER lower down, or by caller if they want an async transition (indicated by an ASYNC return value from leaveState)
                    var fsm = this;
                    this.transition = function() {
                        fsm.transition = null; // this method should only ever be called once
                        fsm.current = to;
                        StateMachine.enterState( fsm, name, from, to, args);
                        StateMachine.changeState(fsm, name, from, to, args);
                        StateMachine.afterEvent( fsm, name, from, to, args);
                        return StateMachine.Result.SUCCEEDED;
                    };
                    this.transition.cancel = function() { // provide a way for caller to cancel async transition if desired (issue #22)
                        fsm.transition = null;
                        StateMachine.afterEvent(fsm, name, from, to, args);
                    }

                    var leave = StateMachine.leaveState(this, name, from, to, args);
                    if (false === leave) {
                        this.transition = null;
                        return StateMachine.Result.CANCELLED;
                    }
                    else if (StateMachine.ASYNC === leave) {
                        return StateMachine.Result.PENDING;
                    }
                    else {
                        if (this.transition) // need to check in case user manually called transition() but forgot to return StateMachine.ASYNC
                            return this.transition();
                    }

                };
            }

        }; // StateMachine

        //===========================================================================

        //======
        // NODE
        //======
        if (typeof exports !== 'undefined') {
            if (typeof module !== 'undefined' && module.exports) {
                exports = module.exports = StateMachine;
            }
            exports.StateMachine = StateMachine;
        }
        //============
        // AMD/REQUIRE
        //============
        else if (typeof define === 'function' && define.amd) {
            define(function(require) { return StateMachine; });
        }
        //========
        // BROWSER
        //========
        else if (typeof window !== 'undefined') {
            window.StateMachine = StateMachine;
        }
        //===========
        // WEB WORKER
        //===========
        else if (typeof self !== 'undefined') {
            self.StateMachine = StateMachine;
        }

    }());

},{}],76:[function(require,module,exports){
    (function (process,Buffer){
        /**
         * Wrapper for built-in http.js to emulate the browser XMLHttpRequest object.
         *
         * This can be used with JS designed for browsers to improve reuse of code and
         * allow the use of existing libraries.
         *
         * Usage: include("XMLHttpRequest.js") and use XMLHttpRequest per W3C specs.
         *
         * @author Dan DeFelippi <dan@driverdan.com>
         * @contributor David Ellis <d.f.ellis@ieee.org>
         * @license MIT
         */

        var Url = require("url");
        var spawn = require("child_process").spawn;
        var fs = require("fs");

        exports.XMLHttpRequest = function() {
            "use strict";

            /**
             * Private variables
             */
            var self = this;
            var http = require("http");
            var https = require("https");

            // Holds http.js objects
            var request;
            var response;

            // Request settings
            var settings = {};

            // Disable header blacklist.
            // Not part of XHR specs.
            var disableHeaderCheck = false;

            // Set some default headers
            var defaultHeaders = {
                "User-Agent": "node-XMLHttpRequest",
                "Accept": "*/*",
            };

            var headers = defaultHeaders;

            // These headers are not user setable.
            // The following are allowed but banned in the spec:
            // * user-agent
            var forbiddenRequestHeaders = [
                "accept-charset",
                "accept-encoding",
                "access-control-request-headers",
                "access-control-request-method",
                "connection",
                "content-length",
                "content-transfer-encoding",
                "cookie",
                "cookie2",
                "date",
                "expect",
                "host",
                "keep-alive",
                "origin",
                "referer",
                "te",
                "trailer",
                "transfer-encoding",
                "upgrade",
                "via"
            ];

            // These request methods are not allowed
            var forbiddenRequestMethods = [
                "TRACE",
                "TRACK",
                "CONNECT"
            ];

            // Send flag
            var sendFlag = false;
            // Error flag, used when errors occur or abort is called
            var errorFlag = false;

            // Event listeners
            var listeners = {};

            /**
             * Constants
             */

            this.UNSENT = 0;
            this.OPENED = 1;
            this.HEADERS_RECEIVED = 2;
            this.LOADING = 3;
            this.DONE = 4;

            /**
             * Public vars
             */

                // Current state
            this.readyState = this.UNSENT;

            // default ready state change handler in case one is not set or is set late
            this.onreadystatechange = null;

            // Result & response
            this.responseText = "";
            this.responseXML = "";
            this.status = null;
            this.statusText = null;

            /**
             * Private methods
             */

            /**
             * Check if the specified header is allowed.
             *
             * @param string header Header to validate
             * @return boolean False if not allowed, otherwise true
             */
            var isAllowedHttpHeader = function(header) {
                return disableHeaderCheck || (header && forbiddenRequestHeaders.indexOf(header.toLowerCase()) === -1);
            };

            /**
             * Check if the specified method is allowed.
             *
             * @param string method Request method to validate
             * @return boolean False if not allowed, otherwise true
             */
            var isAllowedHttpMethod = function(method) {
                return (method && forbiddenRequestMethods.indexOf(method) === -1);
            };

            /**
             * Public methods
             */

            /**
             * Open the connection. Currently supports local server requests.
             *
             * @param string method Connection method (eg GET, POST)
             * @param string url URL for the connection.
             * @param boolean async Asynchronous connection. Default is true.
             * @param string user Username for basic authentication (optional)
             * @param string password Password for basic authentication (optional)
             */
            this.open = function(method, url, async, user, password) {
                this.abort();
                errorFlag = false;

                // Check for valid request method
                if (!isAllowedHttpMethod(method)) {
                    throw "SecurityError: Request method not allowed";
                }

                settings = {
                    "method": method,
                    "url": url.toString(),
                    "async": (typeof async !== "boolean" ? true : async),
                    "user": user || null,
                    "password": password || null
                };

                setState(this.OPENED);
            };

            /**
             * Disables or enables isAllowedHttpHeader() check the request. Enabled by default.
             * This does not conform to the W3C spec.
             *
             * @param boolean state Enable or disable header checking.
             */
            this.setDisableHeaderCheck = function(state) {
                disableHeaderCheck = state;
            };

            /**
             * Sets a header for the request.
             *
             * @param string header Header name
             * @param string value Header value
             */
            this.setRequestHeader = function(header, value) {
                if (this.readyState !== this.OPENED) {
                    throw "INVALID_STATE_ERR: setRequestHeader can only be called when state is OPEN";
                }
                if (!isAllowedHttpHeader(header)) {
                    console.warn("Refused to set unsafe header \"" + header + "\"");
                    return;
                }
                if (sendFlag) {
                    throw "INVALID_STATE_ERR: send flag is true";
                }
                headers[header] = value;
            };

            /**
             * Gets a header from the server response.
             *
             * @param string header Name of header to get.
             * @return string Text of the header or null if it doesn't exist.
             */
            this.getResponseHeader = function(header) {
                if (typeof header === "string"
                    && this.readyState > this.OPENED
                    && response
                    && response.headers
                    && response.headers[header.toLowerCase()]
                    && !errorFlag
                ) {
                    return response.headers[header.toLowerCase()];
                }

                return null;
            };

            /**
             * Gets all the response headers.
             *
             * @return string A string with all response headers separated by CR+LF
             */
            this.getAllResponseHeaders = function() {
                if (this.readyState < this.HEADERS_RECEIVED || errorFlag) {
                    return "";
                }
                var result = "";

                for (var i in response.headers) {
                    // Cookie headers are excluded
                    if (i !== "set-cookie" && i !== "set-cookie2") {
                        result += i + ": " + response.headers[i] + "\r\n";
                    }
                }
                return result.substr(0, result.length - 2);
            };

            /**
             * Gets a request header
             *
             * @param string name Name of header to get
             * @return string Returns the request header or empty string if not set
             */
            this.getRequestHeader = function(name) {
                // @TODO Make this case insensitive
                if (typeof name === "string" && headers[name]) {
                    return headers[name];
                }

                return "";
            };

            /**
             * Sends the request to the server.
             *
             * @param string data Optional data to send as request body.
             */
            this.send = function(data) {
                if (this.readyState !== this.OPENED) {
                    throw "INVALID_STATE_ERR: connection must be opened before send() is called";
                }

                if (sendFlag) {
                    throw "INVALID_STATE_ERR: send has already been called";
                }

                var ssl = false, local = false;
                var url = Url.parse(settings.url);
                var host;
                // Determine the server
                switch (url.protocol) {
                    case "https:":
                        ssl = true;
                    // SSL & non-SSL both need host, no break here.
                    case "http:":
                        host = url.hostname;
                        break;

                    case "file:":
                        local = true;
                        break;

                    case undefined:
                    case "":
                        host = "localhost";
                        break;

                    default:
                        throw "Protocol not supported.";
                }

                // Load files off the local filesystem (file://)
                if (local) {
                    if (settings.method !== "GET") {
                        throw "XMLHttpRequest: Only GET method is supported";
                    }

                    if (settings.async) {
                        fs.readFile(url.pathname, "utf8", function(error, data) {
                            if (error) {
                                self.handleError(error);
                            } else {
                                self.status = 200;
                                self.responseText = data;
                                setState(self.DONE);
                            }
                        });
                    } else {
                        try {
                            this.responseText = fs.readFileSync(url.pathname, "utf8");
                            this.status = 200;
                            setState(self.DONE);
                        } catch(e) {
                            this.handleError(e);
                        }
                    }

                    return;
                }

                // Default to port 80. If accessing localhost on another port be sure
                // to use http://localhost:port/path
                var port = url.port || (ssl ? 443 : 80);
                // Add query string if one is used
                var uri = url.pathname + (url.search ? url.search : "");

                // Set the Host header or the server may reject the request
                headers.Host = host;
                if (!((ssl && port === 443) || port === 80)) {
                    headers.Host += ":" + url.port;
                }

                // Set Basic Auth if necessary
                if (settings.user) {
                    if (typeof settings.password === "undefined") {
                        settings.password = "";
                    }
                    var authBuf = new Buffer(settings.user + ":" + settings.password);
                    headers.Authorization = "Basic " + authBuf.toString("base64");
                }

                // Set content length header
                if (settings.method === "GET" || settings.method === "HEAD") {
                    data = null;
                } else if (data) {
                    headers["Content-Length"] = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);

                    if (!headers["Content-Type"]) {
                        headers["Content-Type"] = "text/plain;charset=UTF-8";
                    }
                } else if (settings.method === "POST") {
                    // For a post with no data set Content-Length: 0.
                    // This is required by buggy servers that don't meet the specs.
                    headers["Content-Length"] = 0;
                }

                var options = {
                    host: host,
                    port: port,
                    path: uri,
                    method: settings.method,
                    headers: headers,
                    agent: false
                };

                // Reset error flag
                errorFlag = false;

                // Handle async requests
                if (settings.async) {
                    // Use the proper protocol
                    var doRequest = ssl ? https.request : http.request;

                    // Request is being sent, set send flag
                    sendFlag = true;

                    // As per spec, this is called here for historical reasons.
                    self.dispatchEvent("readystatechange");

                    // Handler for the response
                    var responseHandler = function responseHandler(resp) {
                        // Set response var to the response we got back
                        // This is so it remains accessable outside this scope
                        response = resp;
                        // Check for redirect
                        // @TODO Prevent looped redirects
                        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307) {
                            // Change URL to the redirect location
                            settings.url = response.headers.location;
                            var url = Url.parse(settings.url);
                            // Set host var in case it's used later
                            host = url.hostname;
                            // Options for the new request
                            var newOptions = {
                                hostname: url.hostname,
                                port: url.port,
                                path: url.path,
                                method: response.statusCode === 303 ? "GET" : settings.method,
                                headers: headers
                            };

                            // Issue the new request
                            request = doRequest(newOptions, responseHandler).on("error", errorHandler);
                            request.end();
                            // @TODO Check if an XHR event needs to be fired here
                            return;
                        }

                        response.setEncoding("utf8");

                        setState(self.HEADERS_RECEIVED);
                        self.status = response.statusCode;

                        response.on("data", function(chunk) {
                            // Make sure there's some data
                            if (chunk) {
                                self.responseText += chunk;
                            }
                            // Don't emit state changes if the connection has been aborted.
                            if (sendFlag) {
                                setState(self.LOADING);
                            }
                        });

                        response.on("end", function() {
                            if (sendFlag) {
                                // Discard the end event if the connection has been aborted
                                setState(self.DONE);
                                sendFlag = false;
                            }
                        });

                        response.on("error", function(error) {
                            self.handleError(error);
                        });
                    };

                    // Error handler for the request
                    var errorHandler = function errorHandler(error) {
                        self.handleError(error);
                    };

                    // Create the request
                    request = doRequest(options, responseHandler).on("error", errorHandler);

                    // Node 0.4 and later won't accept empty data. Make sure it's needed.
                    if (data) {
                        request.write(data);
                    }

                    request.end();

                    self.dispatchEvent("loadstart");
                } else { // Synchronous
                    // Create a temporary file for communication with the other Node process
                    var contentFile = ".node-xmlhttprequest-content-" + process.pid;
                    var syncFile = ".node-xmlhttprequest-sync-" + process.pid;
                    fs.writeFileSync(syncFile, "", "utf8");
                    // The async request the other Node process executes
                    var execString = "var http = require('http'), https = require('https'), fs = require('fs');"
                        + "var doRequest = http" + (ssl ? "s" : "") + ".request;"
                        + "var options = " + JSON.stringify(options) + ";"
                        + "var responseText = '';"
                        + "var req = doRequest(options, function(response) {"
                        + "response.setEncoding('utf8');"
                        + "response.on('data', function(chunk) {"
                        + "  responseText += chunk;"
                        + "});"
                        + "response.on('end', function() {"
                        + "fs.writeFileSync('" + contentFile + "', JSON.stringify({err: null, data: {statusCode: response.statusCode, headers: response.headers, text: responseText}}), 'utf8');"
                        + "fs.unlinkSync('" + syncFile + "');"
                        + "});"
                        + "response.on('error', function(error) {"
                        + "fs.writeFileSync('" + contentFile + "', JSON.stringify({err: error}), 'utf8');"
                        + "fs.unlinkSync('" + syncFile + "');"
                        + "});"
                        + "}).on('error', function(error) {"
                        + "fs.writeFileSync('" + contentFile + "', JSON.stringify({err: error}), 'utf8');"
                        + "fs.unlinkSync('" + syncFile + "');"
                        + "});"
                        + (data ? "req.write('" + JSON.stringify(data).slice(1,-1).replace(/'/g, "\\'") + "');":"")
                        + "req.end();";
                    // Start the other Node Process, executing this string
                    var syncProc = spawn(process.argv[0], ["-e", execString]);
                    while(fs.existsSync(syncFile)) {
                        // Wait while the sync file is empty
                    }
                    var resp = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
                    // Kill the child process once the file has data
                    syncProc.stdin.end();
                    // Remove the temporary file
                    fs.unlinkSync(contentFile);

                    if (resp.err) {
                        self.handleError(resp.err);
                    } else {
                        response = resp.data;
                        self.status = resp.data.statusCode;
                        self.responseText = resp.data.text;
                        setState(self.DONE);
                    }
                }
            };

            /**
             * Called when an error is encountered to deal with it.
             */
            this.handleError = function(error) {
                this.status = 503;
                this.statusText = error;
                this.responseText = error.stack;
                errorFlag = true;
                setState(this.DONE);
            };

            /**
             * Aborts a request.
             */
            this.abort = function() {
                if (request) {
                    request.abort();
                    request = null;
                }

                headers = defaultHeaders;
                this.responseText = "";
                this.responseXML = "";

                errorFlag = true;

                if (this.readyState !== this.UNSENT
                    && (this.readyState !== this.OPENED || sendFlag)
                    && this.readyState !== this.DONE) {
                    sendFlag = false;
                    setState(this.DONE);
                }
                this.readyState = this.UNSENT;
            };

            /**
             * Adds an event listener. Preferred method of binding to events.
             */
            this.addEventListener = function(event, callback) {
                if (!(event in listeners)) {
                    listeners[event] = [];
                }
                // Currently allows duplicate callbacks. Should it?
                listeners[event].push(callback);
            };

            /**
             * Remove an event callback that has already been bound.
             * Only works on the matching funciton, cannot be a copy.
             */
            this.removeEventListener = function(event, callback) {
                if (event in listeners) {
                    // Filter will return a new array with the callback removed
                    listeners[event] = listeners[event].filter(function(ev) {
                        return ev !== callback;
                    });
                }
            };

            /**
             * Dispatch any events, including both "on" methods and events attached using addEventListener.
             */
            this.dispatchEvent = function(event) {
                if (typeof self["on" + event] === "function") {
                    self["on" + event]();
                }
                if (event in listeners) {
                    for (var i = 0, len = listeners[event].length; i < len; i++) {
                        listeners[event][i].call(self);
                    }
                }
            };

            /**
             * Changes readyState and calls onreadystatechange.
             *
             * @param int state New state
             */
            var setState = function(state) {
                if (state == self.LOADING || self.readyState !== state) {
                    self.readyState = state;

                    if (settings.async || self.readyState < self.OPENED || self.readyState === self.DONE) {
                        self.dispatchEvent("readystatechange");
                    }

                    if (self.readyState === self.DONE && !errorFlag) {
                        self.dispatchEvent("load");
                        // @TODO figure out InspectorInstrumentation::didLoadXHR(cookie)
                        self.dispatchEvent("loadend");
                    }
                }
            };
        };

    }).call(this,require('_process'),require("buffer").Buffer)
},{"_process":16,"buffer":8,"child_process":6,"fs":6,"http":35,"https":13,"url":45}],77:[function(require,module,exports){
    (function (global){
        /* jshint strict: false, undef: false */
        /** @namespace Twilio */
        var component = require('../lib');
        var componentName = 'IPMessaging';

// Uses CommonJS, AMD or browser globals to create a
// module using UMD (Universal Module Definition).
        (function (root) {
            // AMD (Requirejs etc)
            if (typeof define === 'function' && define.amd) {
                define([], function() { return component; });
                // Browser globals
            } else {
                root.Twilio = root.Twilio || function Twilio() { };
                if (componentName) {
                    root.Twilio[componentName] = component;
                } else {
                    for (componentName in component) {
                        root.Twilio[componentName] = component[componentName];
                    }
                }
            }
        })(window || global || this);

    }).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../lib":3}]},{},[77]);