'use strict';

const assert = require('assert');

const Sequelize = require('sequelize');
const _ = require('lodash');
const cookie = require('cookie');


module.exports = function(event, context, callback) {
	let sequelize;

	let cookies = _.get(event, 'headers.Cookie', '');
	let sessionId = cookie.parse(cookies).social_demo_session_id;

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
			let sessions = sequelize.define('session', {
				id: {
					type: Sequelize.INTEGER,
					primaryKey: true,
					autoIncrement: true
				},
				user: {
					type: Sequelize.INTEGER
				},
				token: {
					type: Sequelize.STRING
				}
			}, {
				timestamps: false
			});

			return sessions.sync()
				.then(function() {
					return sessions.destroy({
						where: {
							token: sessionId
						}
					});
				});
		})
		.then(function() {
			sequelize.close();

			let cookieString = 'social_demo_session_id=; domain=' + process.env.SITE_DOMAIN + '; expires=' + 0 + '; secure=true; http_only=true';

			var response = {
				statusCode: 302,
				headers: {
					'Set-Cookie' : cookieString,
					Location: '/dev'
				}
			};

			callback(null, response);
		})
		.catch(function(err) {
			if (sequelize) {
				sequelize.close();
			}

			console.log(err);

			callback(null, {
				statusCode: 404,
				body: err.toString()
			});

			return Promise.reject(err);
		});
};
