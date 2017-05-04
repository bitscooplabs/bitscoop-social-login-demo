'use strict';

const assert = require('assert');

const Sequelize = require('sequelize');
const _ = require('lodash');
const cookie = require('cookie');
const human = require('humanparser');
const moment = require('moment');
const uuid = require('uuid');


module.exports = function(event, context, callback) {
	let filter, promise, sequelize, users;

	let cookies = _.get(event, 'headers.Cookie', '');
	let associationId = cookie.parse(cookies).social_demo_session_id;

	let query = event.queryStringParameters || {};
	let service = query.service;
	let type = query.type;

	if (!associationId || (type !== 'signup' && type !== 'login')) {
		callback(null, {
			statusCode: 404,
			body: JSON.stringify({
				sessionId: associationId,
				type: type,
				event: event,
				cookies: cookies
			})
		});
	}
	else {
		promise = Promise.resolve()
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
				let associationSessions = sequelize.define('association_session', {
					id: {
						type: Sequelize.INTEGER,
						primaryKey: true,
						autoIncrement: true
					},
					token: {
						type: Sequelize.STRING
					},
					connectionId: {
						type: Sequelize.STRING,
						field: 'connection_id'
					}
				}, {
					timestamps: false
				});

				users = sequelize.define('user', {
					id: {
						type: Sequelize.INTEGER,
						primaryKey: true,
						autoIncrement: true
					},
					username: {
						type: Sequelize.STRING
					},
					githubId: {
						type: Sequelize.STRING,
						field: 'github_id'
					},
					googleId: {
						type: Sequelize.STRING,
						field: 'google_id'
					},
					facebookId: {
						type: Sequelize.STRING,
						field: 'facebook_id'
					},
					twitterId: {
						type: Sequelize.STRING,
						field: 'twitter_id'
					},
					instagramId: {
						type: Sequelize.STRING,
						field: 'instagram_id'
					},
					email: {
						type: Sequelize.STRING
					},
					upperEmail: {
						type: Sequelize.STRING,
						field: '_upper_email'
					},
					firstName: {
						type: Sequelize.STRING,
						field: 'first_name'
					},
					lastName: {
						type: Sequelize.STRING,
						field: 'last_name'
					},
					joined: {
						type: Sequelize.DATE
					},
					connectionId: {
						type: Sequelize.STRING,
						field: 'connection_id'
					}
				}, {
					timestamps: false
				});

				filter = {
					where: {
						token: associationId,
						connectionId: query.connection_id
					}
				};

				return associationSessions.count(filter)
					.then(function(n) {
						if (n === 0) {
							return Promise.reject(new Error('Invalid association session or association session timeout'));
						}

						let bitscoop = global.env.bitscoop;

						return Promise.all([
							associationSessions.destroy(filter),

							bitscoop.getConnection(query.existing_connection_id || query.connection_id)
						]);
					});
			})
			.then(function(result) {
				let [, connection] = result;

				if (connection == null) {
					return Promise.reject(new Error('Invalid connection'));
				}

				if (!_.get(connection, 'auth.status.authorized', false)) {
					return Promise.reject(new Error('Connection is not authorized. In order to use this account you must grant the requested permissions.'));
				}

				return Promise.resolve(connection);
			});

		if (type === 'login') {
			promise = promise
				.then(function(connection) {
					return users.sync()
						.then(function() {
							return users.find({
								where: {
									connectionId: connection.id
								}
							});
						});
				});
		}
		else if (type === 'signup') {
			promise = promise
				.then(function(connection) {
					return users.sync()
						.then(function() {
							return users.count({
								where: {
									connectionId: connection.id
								}
							});
						})
						.then(function(n) {
							if (n > 0) {
								return Promise.reject(new Error('It looks like you\'ve already associated this account with BitScoop. Try logging in with it instead.'));
							}

							return Promise.resolve(connection);
						});
				});

			promise = promise
				.then(function(connection) {
					let email, promise;

					let user = {
						connectionId: connection.id,
						joined: moment.utc().toDate()
					};

					switch(service) {
						case 'github':
							user.githubId = connection.metadata.id;

							if (connection.metadata.email) {
								email = connection.metadata.email;
							}

							if (connection.metadata.name) {
								let name = human.parseName(connection.metadata.name);

								if (name.firstName) {
									user.firstName = name.firstName;
								}

								if (name.lastName) {
									user.lastName = name.lastName;
								}
							}

							if (connection.metadata.login) {
								user.username = connection.metadata.login;
							}

							break;

						case 'facebook':
							user.facebookId = connection.metadata.id;

							if (connection.metadata.email) {
								email = connection.metadata.email;
							}

							if (connection.metadata.name) {
								let name = human.parseName(connection.metadata.name);

								if (name.firstName) {
									user.firstName = name.firstName;
								}

								if (name.lastName) {
									user.lastName = name.lastName;
								}
							}

							break;

						case 'google':
							user.googleId = connection.metadata.id;

							if (connection.metadata.emails) {
								email = connection.metadata.emails[0].address;
							}

							if (connection.metadata.names) {
								let name = connection.metadata.names[0];

								if (name.first_name) {
									user.firstName = name.first_name;
								}

								if (name.last_name) {
									user.lastName = name.last_name;
								}
							}

							break;

						case 'twitter':
							user.twitterId = connection.metadata.id;

							if (connection.metadata.email) {
								email = connection.metadata.email;
							}

							if (connection.metadata.name) {
								let name = human.parseName(connection.metadata.name);

								if (name.firstName) {
									user.firstName = name.firstName;
								}

								if (name.lastName) {
									user.lastName = name.lastName;
								}
							}

							if (connection.metadata.screen_name) {
								user.username = connection.metadata.screen_name;
							}

							break;

						default:
							break;
					}

					if (email) {
						promise = users.count({
							where: {
								upperEmail: email.toUpperCase()
							}
						});
					}
					else {
						promise = Promise.resolve(0);
					}

					return promise
						.then(function(n) {
							if (email) {
								if (n === 0) {
									user.email = email;
									user.upperEmail = email.toUpperCase();
								}
							}

							return users.sync()
								.then(function() {
									return users.create(user);
								});
						});
				});
		}

		promise = promise
			.then(function(user) {
				if (!user) {
					return Promise.reject(new Error('Not Found'));
				}

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
						return sessions.create({
							user: user.id,
							token: uuid().replace(/-/g, '')
						});
					});
			});

		promise
			.then(function(session) {
				sequelize.close();

				let cookieString = 'social_demo_session_id=' + session.token + '; domain=' + process.env.SITE_DOMAIN + '; expires=' + 0 + '; secure=true; http_only=true';

				callback(null, {
					statusCode: 302,
					headers: {
						'Set-Cookie': cookieString,
						Location: '/dev'
					}
				});

				return Promise.resolve();
			})
			.catch(function(err) {
				if (sequelize) {
					sequelize.close();
				}

				callback(null, {
					statusCode: 404,
					body: err.toString()
				});

				return Promise.reject(err);
			});
	}
};
