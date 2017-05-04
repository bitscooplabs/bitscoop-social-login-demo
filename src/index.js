'use strict';

const BitScoop = require('bitscoop-sdk');

const complete = require('./views/complete');
const home = require('./views/home');
const login = require('./views/login');
const logout = require('./views/logout');
const signup = require('./views/signup');


global.env = {
	name: 'BitScoop',
	bitscoop: new BitScoop(process.env.BITSCOOP_API_KEY)
};


exports.handler = function(event, context, callback) {
	let path = event.path;

	if (path === '/') {
		home(event, context, callback);
	}
	else if (path === '/complete') {
		complete(event, context, callback);
	}
	else if (path === '/login') {
		login(event, context, callback);
	}
	else if (path === '/logout') {
		logout(event, context, callback);
	}
	else if (path === '/signup') {
		signup(event, context, callback);
	}
};
