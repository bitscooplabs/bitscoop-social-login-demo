'use strict';

const assert = require('assert');

const Sequelize = require('sequelize');
const _ = require('lodash');
const cookie = require('cookie');
const nunjucks = require('nunjucks');

const authenticate = require('../middleware/authentication');


let renderer = nunjucks.configure('templates');

module.exports = function(event, context, callback) {
	let sequelize;

	return Promise.resolve()
		.then(function() {
			try {
				assert(process.env.HOST != null, 'Unspecified RDS host.');
				assert(process.env.PORT != null, 'Unspecified RDS port.');
				assert(process.env.USER != null, 'Unspecified RDS user.');
				assert(process.env.PASSWORD != null, 'Unspecified RDS password.');
				assert(process.env.DATABASE != null, 'Unspecified RDS database.');
			} catch(err) {
				return Promise.reject(err);
			}

			sequelize = new Sequelize(process.env.DATABASE, process.env.USER, process.env.PASSWORD, {
				host: process.env.HOST,
				port: process.env.PORT,
				dialect: 'mysql'
			});

			return Promise.resolve();
		})
		.then(function() {
			let cookies = _.get(event, 'headers.Cookie', '');
			let sessionId = cookie.parse(cookies).social_demo_session_id;

			return authenticate(sequelize, sessionId);
		})
		.then(function(result) {
			sequelize.close();

			let html, context;
			let [session, user] = result;

			if (!session || !user) {
				context = {};
			}
			else {
				context = {
					user: user
				};
			}

			html = renderer.render('home.html', context);

			var response = {
				statusCode: 200,
				headers: {
					'Content-Type': 'text/html',
					'Access-Control-Allow-Origin': '*'
				},
				body: html
			};

			callback(null, response);

			return Promise.resolve();
		})
		.catch(function(err) {
			if (sequelize) {
				sequelize.close();
			}

			callback(null, {
				statusCode: 500,
				body: err.toString()
			});

			return Promise.reject(err);
		});
};
