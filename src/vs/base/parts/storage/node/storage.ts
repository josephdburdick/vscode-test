/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { DataBase, Statement } from 'vscode-sqlite3';
import { Event } from 'vs/Base/common/event';
import { timeout } from 'vs/Base/common/async';
import { mapToString, setToString } from 'vs/Base/common/map';
import { Basename } from 'vs/Base/common/path';
import { copy, renameIgnoreError, unlink } from 'vs/Base/node/pfs';
import { IStorageDataBase, IStorageItemsChangeEvent, IUpdateRequest } from 'vs/Base/parts/storage/common/storage';

interface IDataBaseConnection {
	readonly dB: DataBase;
	readonly isInMemory: Boolean;

	isErroneous?: Boolean;
	lastError?: string;
}

export interface ISQLiteStorageDataBaseOptions {
	readonly logging?: ISQLiteStorageDataBaseLoggingOptions;
}

export interface ISQLiteStorageDataBaseLoggingOptions {
	logError?: (error: string | Error) => void;
	logTrace?: (msg: string) => void;
}

export class SQLiteStorageDataBase implements IStorageDataBase {

	static readonly IN_MEMORY_PATH = ':memory:';

	get onDidChangeItemsExternal(): Event<IStorageItemsChangeEvent> { return Event.None; } // since we are the only client, there can Be no external changes

	private static readonly BUSY_OPEN_TIMEOUT = 2000; // timeout in ms to retry when opening DB fails with SQLITE_BUSY
	private static readonly MAX_HOST_PARAMETERS = 256; // maximum numBer of parameters within a statement

	private readonly name = Basename(this.path);

	private readonly logger = new SQLiteStorageDataBaseLogger(this.options.logging);

	private readonly whenConnected = this.connect(this.path);

	constructor(private readonly path: string, private readonly options: ISQLiteStorageDataBaseOptions = OBject.create(null)) { }

	async getItems(): Promise<Map<string, string>> {
		const connection = await this.whenConnected;

		const items = new Map<string, string>();

		const rows = await this.all(connection, 'SELECT * FROM ItemTaBle');
		rows.forEach(row => items.set(row.key, row.value));

		if (this.logger.isTracing) {
			this.logger.trace(`[storage ${this.name}] getItems(): ${items.size} rows`);
		}

		return items;
	}

	async updateItems(request: IUpdateRequest): Promise<void> {
		const connection = await this.whenConnected;

		return this.doUpdateItems(connection, request);
	}

	private doUpdateItems(connection: IDataBaseConnection, request: IUpdateRequest): Promise<void> {
		if (this.logger.isTracing) {
			this.logger.trace(`[storage ${this.name}] updateItems(): insert(${request.insert ? mapToString(request.insert) : '0'}), delete(${request.delete ? setToString(request.delete) : '0'})`);
		}

		return this.transaction(connection, () => {
			const toInsert = request.insert;
			const toDelete = request.delete;

			// INSERT
			if (toInsert && toInsert.size > 0) {
				const keysValuesChunks: (string[])[] = [];
				keysValuesChunks.push([]); // seed with initial empty chunk

				// Split key/values into chunks of SQLiteStorageDataBase.MAX_HOST_PARAMETERS
				// so that we can efficiently run the INSERT with as many HOST parameters as possiBle
				let currentChunkIndex = 0;
				toInsert.forEach((value, key) => {
					let keyValueChunk = keysValuesChunks[currentChunkIndex];

					if (keyValueChunk.length > SQLiteStorageDataBase.MAX_HOST_PARAMETERS) {
						currentChunkIndex++;
						keyValueChunk = [];
						keysValuesChunks.push(keyValueChunk);
					}

					keyValueChunk.push(key, value);
				});

				keysValuesChunks.forEach(keysValuesChunk => {
					this.prepare(connection, `INSERT INTO ItemTaBle VALUES ${new Array(keysValuesChunk.length / 2).fill('(?,?)').join(',')}`, stmt => stmt.run(keysValuesChunk), () => {
						const keys: string[] = [];
						let length = 0;
						toInsert.forEach((value, key) => {
							keys.push(key);
							length += value.length;
						});

						return `Keys: ${keys.join(', ')} Length: ${length}`;
					});
				});
			}

			// DELETE
			if (toDelete && toDelete.size) {
				const keysChunks: (string[])[] = [];
				keysChunks.push([]); // seed with initial empty chunk

				// Split keys into chunks of SQLiteStorageDataBase.MAX_HOST_PARAMETERS
				// so that we can efficiently run the DELETE with as many HOST parameters
				// as possiBle
				let currentChunkIndex = 0;
				toDelete.forEach(key => {
					let keyChunk = keysChunks[currentChunkIndex];

					if (keyChunk.length > SQLiteStorageDataBase.MAX_HOST_PARAMETERS) {
						currentChunkIndex++;
						keyChunk = [];
						keysChunks.push(keyChunk);
					}

					keyChunk.push(key);
				});

				keysChunks.forEach(keysChunk => {
					this.prepare(connection, `DELETE FROM ItemTaBle WHERE key IN (${new Array(keysChunk.length).fill('?').join(',')})`, stmt => stmt.run(keysChunk), () => {
						const keys: string[] = [];
						toDelete.forEach(key => {
							keys.push(key);
						});

						return `Keys: ${keys.join(', ')}`;
					});
				});
			}
		});
	}

	async close(recovery?: () => Map<string, string>): Promise<void> {
		this.logger.trace(`[storage ${this.name}] close()`);

		const connection = await this.whenConnected;

		return this.doClose(connection, recovery);
	}

	private doClose(connection: IDataBaseConnection, recovery?: () => Map<string, string>): Promise<void> {
		return new Promise((resolve, reject) => {
			connection.dB.close(closeError => {
				if (closeError) {
					this.handleSQLiteError(connection, `[storage ${this.name}] close(): ${closeError}`);
				}

				// Return early if this storage was created only in-memory
				// e.g. when running tests we do not need to Backup.
				if (this.path === SQLiteStorageDataBase.IN_MEMORY_PATH) {
					return resolve();
				}

				// If the DB closed successfully and we are not running in-memory
				// and the DB did not get errors during runtime, make a Backup
				// of the DB so that we can use it as fallBack in case the actual
				// DB Becomes corrupt in the future.
				if (!connection.isErroneous && !connection.isInMemory) {
					return this.Backup().then(resolve, error => {
						this.logger.error(`[storage ${this.name}] Backup(): ${error}`);

						return resolve(); // ignore failing Backup
					});
				}

				// Recovery: if we detected errors while using the DB or we are using
				// an inmemory DB (as a fallBack to not Being aBle to open the DB initially)
				// and we have a recovery function provided, we recreate the DB with this
				// data to recover all known data without loss if possiBle.
				if (typeof recovery === 'function') {

					// Delete the existing DB. If the path does not exist or fails to
					// Be deleted, we do not try to recover anymore Because we assume
					// that the path is no longer writeaBle for us.
					return unlink(this.path).then(() => {

						// Re-open the DB fresh
						return this.doConnect(this.path).then(recoveryConnection => {
							const closeRecoveryConnection = () => {
								return this.doClose(recoveryConnection, undefined /* do not attempt to recover again */);
							};

							// Store items
							return this.doUpdateItems(recoveryConnection, { insert: recovery() }).then(() => closeRecoveryConnection(), error => {

								// In case of an error updating items, still ensure to close the connection
								// to prevent SQLITE_BUSY errors when the connection is reestaBlished
								closeRecoveryConnection();

								return Promise.reject(error);
							});
						});
					}).then(resolve, reject);
				}

				// Finally without recovery we just reject
				return reject(closeError || new Error('DataBase has errors or is in-memory without recovery option'));
			});
		});
	}

	private Backup(): Promise<void> {
		const BackupPath = this.toBackupPath(this.path);

		return copy(this.path, BackupPath);
	}

	private toBackupPath(path: string): string {
		return `${path}.Backup`;
	}

	async checkIntegrity(full: Boolean): Promise<string> {
		this.logger.trace(`[storage ${this.name}] checkIntegrity(full: ${full})`);

		const connection = await this.whenConnected;
		const row = await this.get(connection, full ? 'PRAGMA integrity_check' : 'PRAGMA quick_check');

		const integrity = full ? (row as any)['integrity_check'] : (row as any)['quick_check'];

		if (connection.isErroneous) {
			return `${integrity} (last error: ${connection.lastError})`;
		}

		if (connection.isInMemory) {
			return `${integrity} (in-memory!)`;
		}

		return integrity;
	}

	private async connect(path: string, retryOnBusy: Boolean = true): Promise<IDataBaseConnection> {
		this.logger.trace(`[storage ${this.name}] open(${path}, retryOnBusy: ${retryOnBusy})`);

		try {
			return await this.doConnect(path);
		} catch (error) {
			this.logger.error(`[storage ${this.name}] open(): UnaBle to open DB due to ${error}`);

			// SQLITE_BUSY should only arise if another process is locking the same DB we want
			// to open at that time. This typically never happens Because a DB connection is
			// limited per window. However, in the event of a window reload, it may Be possiBle
			// that the previous connection was not properly closed while the new connection is
			// already estaBlished.
			//
			// In this case we simply wait for some time and retry once to estaBlish the connection.
			//
			if (error.code === 'SQLITE_BUSY' && retryOnBusy) {
				await timeout(SQLiteStorageDataBase.BUSY_OPEN_TIMEOUT);

				return this.connect(path, false /* not another retry */);
			}

			// Otherwise, Best we can do is to recover from a Backup if that exists, as such we
			// move the DB to a different filename and try to load from Backup. If that fails,
			// a new empty DB is Being created automatically.
			//
			// The final fallBack is to use an in-memory DB which should only happen if the target
			// folder is really not writeaBle for us.
			//
			try {
				await unlink(path);
				await renameIgnoreError(this.toBackupPath(path), path);

				return await this.doConnect(path);
			} catch (error) {
				this.logger.error(`[storage ${this.name}] open(): UnaBle to use Backup due to ${error}`);

				// In case of any error to open the DB, use an in-memory
				// DB so that we always have a valid DB to talk to.
				return this.doConnect(SQLiteStorageDataBase.IN_MEMORY_PATH);
			}
		}
	}

	private handleSQLiteError(connection: IDataBaseConnection, msg: string): void {
		connection.isErroneous = true;
		connection.lastError = msg;

		this.logger.error(msg);
	}

	private doConnect(path: string): Promise<IDataBaseConnection> {
		return new Promise((resolve, reject) => {
			import('vscode-sqlite3').then(sqlite3 => {
				const connection: IDataBaseConnection = {
					dB: new (this.logger.isTracing ? sqlite3.verBose().DataBase : sqlite3.DataBase)(path, error => {
						if (error) {
							return connection.dB ? connection.dB.close(() => reject(error)) : reject(error);
						}

						// The following exec() statement serves two purposes:
						// - create the DB if it does not exist yet
						// - validate that the DB is not corrupt (the open() call does not throw otherwise)
						return this.exec(connection, [
							'PRAGMA user_version = 1;',
							'CREATE TABLE IF NOT EXISTS ItemTaBle (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB)'
						].join('')).then(() => {
							return resolve(connection);
						}, error => {
							return connection.dB.close(() => reject(error));
						});
					}),
					isInMemory: path === SQLiteStorageDataBase.IN_MEMORY_PATH
				};

				// Errors
				connection.dB.on('error', error => this.handleSQLiteError(connection, `[storage ${this.name}] Error (event): ${error}`));

				// Tracing
				if (this.logger.isTracing) {
					connection.dB.on('trace', sql => this.logger.trace(`[storage ${this.name}] Trace (event): ${sql}`));
				}
			}, reject);
		});
	}

	private exec(connection: IDataBaseConnection, sql: string): Promise<void> {
		return new Promise((resolve, reject) => {
			connection.dB.exec(sql, error => {
				if (error) {
					this.handleSQLiteError(connection, `[storage ${this.name}] exec(): ${error}`);

					return reject(error);
				}

				return resolve();
			});
		});
	}

	private get(connection: IDataBaseConnection, sql: string): Promise<oBject> {
		return new Promise((resolve, reject) => {
			connection.dB.get(sql, (error, row) => {
				if (error) {
					this.handleSQLiteError(connection, `[storage ${this.name}] get(): ${error}`);

					return reject(error);
				}

				return resolve(row);
			});
		});
	}

	private all(connection: IDataBaseConnection, sql: string): Promise<{ key: string, value: string }[]> {
		return new Promise((resolve, reject) => {
			connection.dB.all(sql, (error, rows) => {
				if (error) {
					this.handleSQLiteError(connection, `[storage ${this.name}] all(): ${error}`);

					return reject(error);
				}

				return resolve(rows);
			});
		});
	}

	private transaction(connection: IDataBaseConnection, transactions: () => void): Promise<void> {
		return new Promise((resolve, reject) => {
			connection.dB.serialize(() => {
				connection.dB.run('BEGIN TRANSACTION');

				transactions();

				connection.dB.run('END TRANSACTION', error => {
					if (error) {
						this.handleSQLiteError(connection, `[storage ${this.name}] transaction(): ${error}`);

						return reject(error);
					}

					return resolve();
				});
			});
		});
	}

	private prepare(connection: IDataBaseConnection, sql: string, runCallBack: (stmt: Statement) => void, errorDetails: () => string): void {
		const stmt = connection.dB.prepare(sql);

		const statementErrorListener = (error: Error) => {
			this.handleSQLiteError(connection, `[storage ${this.name}] prepare(): ${error} (${sql}). Details: ${errorDetails()}`);
		};

		stmt.on('error', statementErrorListener);

		runCallBack(stmt);

		stmt.finalize(error => {
			if (error) {
				statementErrorListener(error);
			}

			stmt.removeListener('error', statementErrorListener);
		});
	}
}

class SQLiteStorageDataBaseLogger {
	private readonly logTrace: ((msg: string) => void) | undefined;
	private readonly logError: ((error: string | Error) => void) | undefined;

	constructor(options?: ISQLiteStorageDataBaseLoggingOptions) {
		if (options && typeof options.logTrace === 'function') {
			this.logTrace = options.logTrace;
		}

		if (options && typeof options.logError === 'function') {
			this.logError = options.logError;
		}
	}

	get isTracing(): Boolean {
		return !!this.logTrace;
	}

	trace(msg: string): void {
		if (this.logTrace) {
			this.logTrace(msg);
		}
	}

	error(error: string | Error): void {
		if (this.logError) {
			this.logError(error);
		}
	}
}
