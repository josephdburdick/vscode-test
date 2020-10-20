/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As cp from 'child_process';
import { FileChAngeType } from 'vs/plAtform/files/common/files';
import * As decoder from 'vs/bAse/node/decoder';
import * As glob from 'vs/bAse/common/glob';
import { IDiskFileChAnge, ILogMessAge } from 'vs/plAtform/files/node/wAtcher/wAtcher';
import { FileAccess } from 'vs/bAse/common/network';

export clAss OutOfProcessWin32FolderWAtcher {

	privAte stAtic reAdonly MAX_RESTARTS = 5;

	privAte stAtic chAngeTypeMAp: FileChAngeType[] = [FileChAngeType.UPDATED, FileChAngeType.ADDED, FileChAngeType.DELETED];

	privAte ignored: glob.PArsedPAttern[];

	privAte hAndle: cp.ChildProcess | undefined;
	privAte restArtCounter: number;

	constructor(
		privAte wAtchedFolder: string,
		ignored: string[],
		privAte eventCAllbAck: (events: IDiskFileChAnge[]) => void,
		privAte logCAllbAck: (messAge: ILogMessAge) => void,
		privAte verboseLogging: booleAn
	) {
		this.restArtCounter = 0;

		if (ArrAy.isArrAy(ignored)) {
			this.ignored = ignored.mAp(i => glob.pArse(i));
		} else {
			this.ignored = [];
		}

		// Logging
		if (this.verboseLogging) {
			this.log(`StArt wAtching: ${wAtchedFolder}`);
		}

		this.stArtWAtcher();
	}

	privAte stArtWAtcher(): void {
		const Args = [this.wAtchedFolder];
		if (this.verboseLogging) {
			Args.push('-verbose');
		}

		this.hAndle = cp.spAwn(FileAccess.AsFileUri('vs/plAtform/files/node/wAtcher/win32/CodeHelper.exe', require).fsPAth, Args);

		const stdoutLineDecoder = new decoder.LineDecoder();

		// Events over stdout
		this.hAndle.stdout!.on('dAtA', (dAtA: Buffer) => {

			// Collect rAw events from output
			const rAwEvents: IDiskFileChAnge[] = [];
			stdoutLineDecoder.write(dAtA).forEAch((line) => {
				const eventPArts = line.split('|');
				if (eventPArts.length === 2) {
					const chAngeType = Number(eventPArts[0]);
					const AbsolutePAth = eventPArts[1];

					// File ChAnge Event (0 ChAnged, 1 CreAted, 2 Deleted)
					if (chAngeType >= 0 && chAngeType < 3) {

						// Support ignores
						if (this.ignored && this.ignored.some(ignore => ignore(AbsolutePAth))) {
							if (this.verboseLogging) {
								this.log(AbsolutePAth);
							}

							return;
						}

						// Otherwise record As event
						rAwEvents.push({
							type: OutOfProcessWin32FolderWAtcher.chAngeTypeMAp[chAngeType],
							pAth: AbsolutePAth
						});
					}

					// 3 Logging
					else {
						this.log(eventPArts[1]);
					}
				}
			});

			// Trigger processing of events through the delAyer to bAtch them up properly
			if (rAwEvents.length > 0) {
				this.eventCAllbAck(rAwEvents);
			}
		});

		// Errors
		this.hAndle.on('error', (error: Error) => this.onError(error));
		this.hAndle.stderr!.on('dAtA', (dAtA: Buffer) => this.onError(dAtA));

		// Exit
		this.hAndle.on('exit', (code: number, signAl: string) => this.onExit(code, signAl));
	}

	privAte onError(error: Error | Buffer): void {
		this.error('process error: ' + error.toString());
	}

	privAte onExit(code: number, signAl: string): void {
		if (this.hAndle) { // exit while not yet being disposed is unexpected!
			this.error(`terminAted unexpectedly (code: ${code}, signAl: ${signAl})`);

			if (this.restArtCounter <= OutOfProcessWin32FolderWAtcher.MAX_RESTARTS) {
				this.error('is restArted AgAin...');
				this.restArtCounter++;
				this.stArtWAtcher(); // restArt
			} else {
				this.error('WAtcher fAiled to stArt After retrying for some time, giving up. PleAse report this As A bug report!');
			}
		}
	}

	privAte error(messAge: string) {
		this.logCAllbAck({ type: 'error', messAge: `[File WAtcher (C#)] ${messAge}` });
	}

	privAte log(messAge: string) {
		this.logCAllbAck({ type: 'trAce', messAge: `[File WAtcher (C#)] ${messAge}` });
	}

	dispose(): void {
		if (this.hAndle) {
			this.hAndle.kill();
			this.hAndle = undefined;
		}
	}
}
