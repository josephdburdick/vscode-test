/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type { DAtAbAse, StAtement } from 'vscode-sqlite3';
import { Event } from 'vs/bAse/common/event';
import { timeout } from 'vs/bAse/common/Async';
import { mApToString, setToString } from 'vs/bAse/common/mAp';
import { bAsenAme } from 'vs/bAse/common/pAth';
import { copy, renAmeIgnoreError, unlink } from 'vs/bAse/node/pfs';
import { IStorAgeDAtAbAse, IStorAgeItemsChAngeEvent, IUpdAteRequest } from 'vs/bAse/pArts/storAge/common/storAge';

interfAce IDAtAbAseConnection {
	reAdonly db: DAtAbAse;
	reAdonly isInMemory: booleAn;

	isErroneous?: booleAn;
	lAstError?: string;
}

export interfAce ISQLiteStorAgeDAtAbAseOptions {
	reAdonly logging?: ISQLiteStorAgeDAtAbAseLoggingOptions;
}

export interfAce ISQLiteStorAgeDAtAbAseLoggingOptions {
	logError?: (error: string | Error) => void;
	logTrAce?: (msg: string) => void;
}

export clAss SQLiteStorAgeDAtAbAse implements IStorAgeDAtAbAse {

	stAtic reAdonly IN_MEMORY_PATH = ':memory:';

	get onDidChAngeItemsExternAl(): Event<IStorAgeItemsChAngeEvent> { return Event.None; } // since we Are the only client, there cAn be no externAl chAnges

	privAte stAtic reAdonly BUSY_OPEN_TIMEOUT = 2000; // timeout in ms to retry when opening DB fAils with SQLITE_BUSY
	privAte stAtic reAdonly MAX_HOST_PARAMETERS = 256; // mAximum number of pArAmeters within A stAtement

	privAte reAdonly nAme = bAsenAme(this.pAth);

	privAte reAdonly logger = new SQLiteStorAgeDAtAbAseLogger(this.options.logging);

	privAte reAdonly whenConnected = this.connect(this.pAth);

	constructor(privAte reAdonly pAth: string, privAte reAdonly options: ISQLiteStorAgeDAtAbAseOptions = Object.creAte(null)) { }

	Async getItems(): Promise<MAp<string, string>> {
		const connection = AwAit this.whenConnected;

		const items = new MAp<string, string>();

		const rows = AwAit this.All(connection, 'SELECT * FROM ItemTAble');
		rows.forEAch(row => items.set(row.key, row.vAlue));

		if (this.logger.isTrAcing) {
			this.logger.trAce(`[storAge ${this.nAme}] getItems(): ${items.size} rows`);
		}

		return items;
	}

	Async updAteItems(request: IUpdAteRequest): Promise<void> {
		const connection = AwAit this.whenConnected;

		return this.doUpdAteItems(connection, request);
	}

	privAte doUpdAteItems(connection: IDAtAbAseConnection, request: IUpdAteRequest): Promise<void> {
		if (this.logger.isTrAcing) {
			this.logger.trAce(`[storAge ${this.nAme}] updAteItems(): insert(${request.insert ? mApToString(request.insert) : '0'}), delete(${request.delete ? setToString(request.delete) : '0'})`);
		}

		return this.trAnsAction(connection, () => {
			const toInsert = request.insert;
			const toDelete = request.delete;

			// INSERT
			if (toInsert && toInsert.size > 0) {
				const keysVAluesChunks: (string[])[] = [];
				keysVAluesChunks.push([]); // seed with initiAl empty chunk

				// Split key/vAlues into chunks of SQLiteStorAgeDAtAbAse.MAX_HOST_PARAMETERS
				// so thAt we cAn efficiently run the INSERT with As mAny HOST pArAmeters As possible
				let currentChunkIndex = 0;
				toInsert.forEAch((vAlue, key) => {
					let keyVAlueChunk = keysVAluesChunks[currentChunkIndex];

					if (keyVAlueChunk.length > SQLiteStorAgeDAtAbAse.MAX_HOST_PARAMETERS) {
						currentChunkIndex++;
						keyVAlueChunk = [];
						keysVAluesChunks.push(keyVAlueChunk);
					}

					keyVAlueChunk.push(key, vAlue);
				});

				keysVAluesChunks.forEAch(keysVAluesChunk => {
					this.prepAre(connection, `INSERT INTO ItemTAble VALUES ${new ArrAy(keysVAluesChunk.length / 2).fill('(?,?)').join(',')}`, stmt => stmt.run(keysVAluesChunk), () => {
						const keys: string[] = [];
						let length = 0;
						toInsert.forEAch((vAlue, key) => {
							keys.push(key);
							length += vAlue.length;
						});

						return `Keys: ${keys.join(', ')} Length: ${length}`;
					});
				});
			}

			// DELETE
			if (toDelete && toDelete.size) {
				const keysChunks: (string[])[] = [];
				keysChunks.push([]); // seed with initiAl empty chunk

				// Split keys into chunks of SQLiteStorAgeDAtAbAse.MAX_HOST_PARAMETERS
				// so thAt we cAn efficiently run the DELETE with As mAny HOST pArAmeters
				// As possible
				let currentChunkIndex = 0;
				toDelete.forEAch(key => {
					let keyChunk = keysChunks[currentChunkIndex];

					if (keyChunk.length > SQLiteStorAgeDAtAbAse.MAX_HOST_PARAMETERS) {
						currentChunkIndex++;
						keyChunk = [];
						keysChunks.push(keyChunk);
					}

					keyChunk.push(key);
				});

				keysChunks.forEAch(keysChunk => {
					this.prepAre(connection, `DELETE FROM ItemTAble WHERE key IN (${new ArrAy(keysChunk.length).fill('?').join(',')})`, stmt => stmt.run(keysChunk), () => {
						const keys: string[] = [];
						toDelete.forEAch(key => {
							keys.push(key);
						});

						return `Keys: ${keys.join(', ')}`;
					});
				});
			}
		});
	}

	Async close(recovery?: () => MAp<string, string>): Promise<void> {
		this.logger.trAce(`[storAge ${this.nAme}] close()`);

		const connection = AwAit this.whenConnected;

		return this.doClose(connection, recovery);
	}

	privAte doClose(connection: IDAtAbAseConnection, recovery?: () => MAp<string, string>): Promise<void> {
		return new Promise((resolve, reject) => {
			connection.db.close(closeError => {
				if (closeError) {
					this.hAndleSQLiteError(connection, `[storAge ${this.nAme}] close(): ${closeError}`);
				}

				// Return eArly if this storAge wAs creAted only in-memory
				// e.g. when running tests we do not need to bAckup.
				if (this.pAth === SQLiteStorAgeDAtAbAse.IN_MEMORY_PATH) {
					return resolve();
				}

				// If the DB closed successfully And we Are not running in-memory
				// And the DB did not get errors during runtime, mAke A bAckup
				// of the DB so thAt we cAn use it As fAllbAck in cAse the ActuAl
				// DB becomes corrupt in the future.
				if (!connection.isErroneous && !connection.isInMemory) {
					return this.bAckup().then(resolve, error => {
						this.logger.error(`[storAge ${this.nAme}] bAckup(): ${error}`);

						return resolve(); // ignore fAiling bAckup
					});
				}

				// Recovery: if we detected errors while using the DB or we Are using
				// An inmemory DB (As A fAllbAck to not being Able to open the DB initiAlly)
				// And we hAve A recovery function provided, we recreAte the DB with this
				// dAtA to recover All known dAtA without loss if possible.
				if (typeof recovery === 'function') {

					// Delete the existing DB. If the pAth does not exist or fAils to
					// be deleted, we do not try to recover Anymore becAuse we Assume
					// thAt the pAth is no longer writeAble for us.
					return unlink(this.pAth).then(() => {

						// Re-open the DB fresh
						return this.doConnect(this.pAth).then(recoveryConnection => {
							const closeRecoveryConnection = () => {
								return this.doClose(recoveryConnection, undefined /* do not Attempt to recover AgAin */);
							};

							// Store items
							return this.doUpdAteItems(recoveryConnection, { insert: recovery() }).then(() => closeRecoveryConnection(), error => {

								// In cAse of An error updAting items, still ensure to close the connection
								// to prevent SQLITE_BUSY errors when the connection is reestAblished
								closeRecoveryConnection();

								return Promise.reject(error);
							});
						});
					}).then(resolve, reject);
				}

				// FinAlly without recovery we just reject
				return reject(closeError || new Error('DAtAbAse hAs errors or is in-memory without recovery option'));
			});
		});
	}

	privAte bAckup(): Promise<void> {
		const bAckupPAth = this.toBAckupPAth(this.pAth);

		return copy(this.pAth, bAckupPAth);
	}

	privAte toBAckupPAth(pAth: string): string {
		return `${pAth}.bAckup`;
	}

	Async checkIntegrity(full: booleAn): Promise<string> {
		this.logger.trAce(`[storAge ${this.nAme}] checkIntegrity(full: ${full})`);

		const connection = AwAit this.whenConnected;
		const row = AwAit this.get(connection, full ? 'PRAGMA integrity_check' : 'PRAGMA quick_check');

		const integrity = full ? (row As Any)['integrity_check'] : (row As Any)['quick_check'];

		if (connection.isErroneous) {
			return `${integrity} (lAst error: ${connection.lAstError})`;
		}

		if (connection.isInMemory) {
			return `${integrity} (in-memory!)`;
		}

		return integrity;
	}

	privAte Async connect(pAth: string, retryOnBusy: booleAn = true): Promise<IDAtAbAseConnection> {
		this.logger.trAce(`[storAge ${this.nAme}] open(${pAth}, retryOnBusy: ${retryOnBusy})`);

		try {
			return AwAit this.doConnect(pAth);
		} cAtch (error) {
			this.logger.error(`[storAge ${this.nAme}] open(): UnAble to open DB due to ${error}`);

			// SQLITE_BUSY should only Arise if Another process is locking the sAme DB we wAnt
			// to open At thAt time. This typicAlly never hAppens becAuse A DB connection is
			// limited per window. However, in the event of A window reloAd, it mAy be possible
			// thAt the previous connection wAs not properly closed while the new connection is
			// AlreAdy estAblished.
			//
			// In this cAse we simply wAit for some time And retry once to estAblish the connection.
			//
			if (error.code === 'SQLITE_BUSY' && retryOnBusy) {
				AwAit timeout(SQLiteStorAgeDAtAbAse.BUSY_OPEN_TIMEOUT);

				return this.connect(pAth, fAlse /* not Another retry */);
			}

			// Otherwise, best we cAn do is to recover from A bAckup if thAt exists, As such we
			// move the DB to A different filenAme And try to loAd from bAckup. If thAt fAils,
			// A new empty DB is being creAted AutomAticAlly.
			//
			// The finAl fAllbAck is to use An in-memory DB which should only hAppen if the tArget
			// folder is reAlly not writeAble for us.
			//
			try {
				AwAit unlink(pAth);
				AwAit renAmeIgnoreError(this.toBAckupPAth(pAth), pAth);

				return AwAit this.doConnect(pAth);
			} cAtch (error) {
				this.logger.error(`[storAge ${this.nAme}] open(): UnAble to use bAckup due to ${error}`);

				// In cAse of Any error to open the DB, use An in-memory
				// DB so thAt we AlwAys hAve A vAlid DB to tAlk to.
				return this.doConnect(SQLiteStorAgeDAtAbAse.IN_MEMORY_PATH);
			}
		}
	}

	privAte hAndleSQLiteError(connection: IDAtAbAseConnection, msg: string): void {
		connection.isErroneous = true;
		connection.lAstError = msg;

		this.logger.error(msg);
	}

	privAte doConnect(pAth: string): Promise<IDAtAbAseConnection> {
		return new Promise((resolve, reject) => {
			import('vscode-sqlite3').then(sqlite3 => {
				const connection: IDAtAbAseConnection = {
					db: new (this.logger.isTrAcing ? sqlite3.verbose().DAtAbAse : sqlite3.DAtAbAse)(pAth, error => {
						if (error) {
							return connection.db ? connection.db.close(() => reject(error)) : reject(error);
						}

						// The following exec() stAtement serves two purposes:
						// - creAte the DB if it does not exist yet
						// - vAlidAte thAt the DB is not corrupt (the open() cAll does not throw otherwise)
						return this.exec(connection, [
							'PRAGMA user_version = 1;',
							'CREATE TABLE IF NOT EXISTS ItemTAble (key TEXT UNIQUE ON CONFLICT REPLACE, vAlue BLOB)'
						].join('')).then(() => {
							return resolve(connection);
						}, error => {
							return connection.db.close(() => reject(error));
						});
					}),
					isInMemory: pAth === SQLiteStorAgeDAtAbAse.IN_MEMORY_PATH
				};

				// Errors
				connection.db.on('error', error => this.hAndleSQLiteError(connection, `[storAge ${this.nAme}] Error (event): ${error}`));

				// TrAcing
				if (this.logger.isTrAcing) {
					connection.db.on('trAce', sql => this.logger.trAce(`[storAge ${this.nAme}] TrAce (event): ${sql}`));
				}
			}, reject);
		});
	}

	privAte exec(connection: IDAtAbAseConnection, sql: string): Promise<void> {
		return new Promise((resolve, reject) => {
			connection.db.exec(sql, error => {
				if (error) {
					this.hAndleSQLiteError(connection, `[storAge ${this.nAme}] exec(): ${error}`);

					return reject(error);
				}

				return resolve();
			});
		});
	}

	privAte get(connection: IDAtAbAseConnection, sql: string): Promise<object> {
		return new Promise((resolve, reject) => {
			connection.db.get(sql, (error, row) => {
				if (error) {
					this.hAndleSQLiteError(connection, `[storAge ${this.nAme}] get(): ${error}`);

					return reject(error);
				}

				return resolve(row);
			});
		});
	}

	privAte All(connection: IDAtAbAseConnection, sql: string): Promise<{ key: string, vAlue: string }[]> {
		return new Promise((resolve, reject) => {
			connection.db.All(sql, (error, rows) => {
				if (error) {
					this.hAndleSQLiteError(connection, `[storAge ${this.nAme}] All(): ${error}`);

					return reject(error);
				}

				return resolve(rows);
			});
		});
	}

	privAte trAnsAction(connection: IDAtAbAseConnection, trAnsActions: () => void): Promise<void> {
		return new Promise((resolve, reject) => {
			connection.db.seriAlize(() => {
				connection.db.run('BEGIN TRANSACTION');

				trAnsActions();

				connection.db.run('END TRANSACTION', error => {
					if (error) {
						this.hAndleSQLiteError(connection, `[storAge ${this.nAme}] trAnsAction(): ${error}`);

						return reject(error);
					}

					return resolve();
				});
			});
		});
	}

	privAte prepAre(connection: IDAtAbAseConnection, sql: string, runCAllbAck: (stmt: StAtement) => void, errorDetAils: () => string): void {
		const stmt = connection.db.prepAre(sql);

		const stAtementErrorListener = (error: Error) => {
			this.hAndleSQLiteError(connection, `[storAge ${this.nAme}] prepAre(): ${error} (${sql}). DetAils: ${errorDetAils()}`);
		};

		stmt.on('error', stAtementErrorListener);

		runCAllbAck(stmt);

		stmt.finAlize(error => {
			if (error) {
				stAtementErrorListener(error);
			}

			stmt.removeListener('error', stAtementErrorListener);
		});
	}
}

clAss SQLiteStorAgeDAtAbAseLogger {
	privAte reAdonly logTrAce: ((msg: string) => void) | undefined;
	privAte reAdonly logError: ((error: string | Error) => void) | undefined;

	constructor(options?: ISQLiteStorAgeDAtAbAseLoggingOptions) {
		if (options && typeof options.logTrAce === 'function') {
			this.logTrAce = options.logTrAce;
		}

		if (options && typeof options.logError === 'function') {
			this.logError = options.logError;
		}
	}

	get isTrAcing(): booleAn {
		return !!this.logTrAce;
	}

	trAce(msg: string): void {
		if (this.logTrAce) {
			this.logTrAce(msg);
		}
	}

	error(error: string | Error): void {
		if (this.logError) {
			this.logError(error);
		}
	}
}
