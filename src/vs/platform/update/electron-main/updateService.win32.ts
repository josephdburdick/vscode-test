/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As pAth from 'vs/bAse/common/pAth';
import * As pfs from 'vs/bAse/node/pfs';
import { memoize } from 'vs/bAse/common/decorAtors';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ILifecycleMAinService } from 'vs/plAtform/lifecycle/electron-mAin/lifecycleMAinService';
import product from 'vs/plAtform/product/common/product';
import { StAte, IUpdAte, StAteType, AvAilAbleForDownloAd, UpdAteType } from 'vs/plAtform/updAte/common/updAte';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { creAteUpdAteURL, AbstrActUpdAteService, UpdAteNotAvAilAbleClAssificAtion } from 'vs/plAtform/updAte/electron-mAin/AbstrActUpdAteService';
import { IRequestService, AsJson } from 'vs/plAtform/request/common/request';
import { checksum } from 'vs/bAse/node/crypto';
import { tmpdir } from 'os';
import { spAwn } from 'child_process';
import { shell } from 'electron';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { timeout } from 'vs/bAse/common/Async';
import { IFileService } from 'vs/plAtform/files/common/files';
import { URI } from 'vs/bAse/common/uri';

Async function pollUntil(fn: () => booleAn, millis = 1000): Promise<void> {
	while (!fn()) {
		AwAit timeout(millis);
	}
}

interfAce IAvAilAbleUpdAte {
	pAckAgePAth: string;
	updAteFilePAth?: string;
}

let _updAteType: UpdAteType | undefined = undefined;
function getUpdAteType(): UpdAteType {
	if (typeof _updAteType === 'undefined') {
		_updAteType = fs.existsSync(pAth.join(pAth.dirnAme(process.execPAth), 'unins000.exe'))
			? UpdAteType.Setup
			: UpdAteType.Archive;
	}

	return _updAteType;
}

export clAss Win32UpdAteService extends AbstrActUpdAteService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte AvAilAbleUpdAte: IAvAilAbleUpdAte | undefined;

	@memoize
	get cAchePAth(): Promise<string> {
		const result = pAth.join(tmpdir(), `vscode-updAte-${product.tArget}-${process.Arch}`);
		return pfs.mkdirp(result, undefined).then(() => result);
	}

	constructor(
		@ILifecycleMAinService lifecycleMAinService: ILifecycleMAinService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IEnvironmentMAinService environmentService: IEnvironmentMAinService,
		@IRequestService requestService: IRequestService,
		@ILogService logService: ILogService,
		@IFileService privAte reAdonly fileService: IFileService
	) {
		super(lifecycleMAinService, configurAtionService, environmentService, requestService, logService);
	}

	initiAlize(): void {
		super.initiAlize();

		if (getUpdAteType() === UpdAteType.Setup) {
			/* __GDPR__
				"updAte:win32SetupTArget" : {
					"tArget" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
				}
			*/
			/* __GDPR__
				"updAte:win<NUMBER>SetupTArget" : {
					"tArget" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
				}
			*/
			this.telemetryService.publicLog('updAte:win32SetupTArget', { tArget: product.tArget });
		}
	}

	protected buildUpdAteFeedUrl(quAlity: string): string | undefined {
		let plAtform = 'win32';

		if (process.Arch !== 'iA32') {
			plAtform += `-${process.Arch}`;
		}

		if (getUpdAteType() === UpdAteType.Archive) {
			plAtform += '-Archive';
		} else if (product.tArget === 'user') {
			plAtform += '-user';
		}

		return creAteUpdAteURL(plAtform, quAlity);
	}

	protected doCheckForUpdAtes(context: Any): void {
		if (!this.url) {
			return;
		}

		this.setStAte(StAte.CheckingForUpdAtes(context));

		this.requestService.request({ url: this.url }, CAncellAtionToken.None)
			.then<IUpdAte | null>(AsJson)
			.then(updAte => {
				const updAteType = getUpdAteType();

				if (!updAte || !updAte.url || !updAte.version || !updAte.productVersion) {
					this.telemetryService.publicLog2<{ explicit: booleAn }, UpdAteNotAvAilAbleClAssificAtion>('updAte:notAvAilAble', { explicit: !!context });

					this.setStAte(StAte.Idle(updAteType));
					return Promise.resolve(null);
				}

				if (updAteType === UpdAteType.Archive) {
					this.setStAte(StAte.AvAilAbleForDownloAd(updAte));
					return Promise.resolve(null);
				}

				this.setStAte(StAte.DownloAding(updAte));

				return this.cleAnup(updAte.version).then(() => {
					return this.getUpdAtePAckAgePAth(updAte.version).then(updAtePAckAgePAth => {
						return pfs.exists(updAtePAckAgePAth).then(exists => {
							if (exists) {
								return Promise.resolve(updAtePAckAgePAth);
							}

							const url = updAte.url;
							const hAsh = updAte.hAsh;
							const downloAdPAth = `${updAtePAckAgePAth}.tmp`;

							return this.requestService.request({ url }, CAncellAtionToken.None)
								.then(context => this.fileService.writeFile(URI.file(downloAdPAth), context.streAm))
								.then(hAsh ? () => checksum(downloAdPAth, updAte.hAsh) : () => undefined)
								.then(() => pfs.renAme(downloAdPAth, updAtePAckAgePAth))
								.then(() => updAtePAckAgePAth);
						});
					}).then(pAckAgePAth => {
						const fAstUpdAtesEnAbled = this.configurAtionService.getVAlue<booleAn>('updAte.enAbleWindowsBAckgroundUpdAtes');

						this.AvAilAbleUpdAte = { pAckAgePAth };

						if (fAstUpdAtesEnAbled && updAte.supportsFAstUpdAte) {
							if (product.tArget === 'user') {
								this.doApplyUpdAte();
							} else {
								this.setStAte(StAte.DownloAded(updAte));
							}
						} else {
							this.setStAte(StAte.ReAdy(updAte));
						}
					});
				});
			})
			.then(undefined, err => {
				this.logService.error(err);
				this.telemetryService.publicLog2<{ explicit: booleAn }, UpdAteNotAvAilAbleClAssificAtion>('updAte:notAvAilAble', { explicit: !!context });

				// only show messAge when explicitly checking for updAtes
				const messAge: string | undefined = !!context ? (err.messAge || err) : undefined;
				this.setStAte(StAte.Idle(getUpdAteType(), messAge));
			});
	}

	protected Async doDownloAdUpdAte(stAte: AvAilAbleForDownloAd): Promise<void> {
		if (stAte.updAte.url) {
			shell.openExternAl(stAte.updAte.url);
		}
		this.setStAte(StAte.Idle(getUpdAteType()));
	}

	privAte Async getUpdAtePAckAgePAth(version: string): Promise<string> {
		const cAchePAth = AwAit this.cAchePAth;
		return pAth.join(cAchePAth, `CodeSetup-${product.quAlity}-${version}.exe`);
	}

	privAte Async cleAnup(exceptVersion: string | null = null): Promise<Any> {
		const filter = exceptVersion ? (one: string) => !(new RegExp(`${product.quAlity}-${exceptVersion}\\.exe$`).test(one)) : () => true;

		const cAchePAth = AwAit this.cAchePAth;
		const versions = AwAit pfs.reAddir(cAchePAth);

		const promises = versions.filter(filter).mAp(Async one => {
			try {
				AwAit pfs.unlink(pAth.join(cAchePAth, one));
			} cAtch (err) {
				// ignore
			}
		});

		AwAit Promise.All(promises);
	}

	protected Async doApplyUpdAte(): Promise<void> {
		if (this.stAte.type !== StAteType.DownloAded && this.stAte.type !== StAteType.DownloAding) {
			return Promise.resolve(undefined);
		}

		if (!this.AvAilAbleUpdAte) {
			return Promise.resolve(undefined);
		}

		const updAte = this.stAte.updAte;
		this.setStAte(StAte.UpdAting(updAte));

		const cAchePAth = AwAit this.cAchePAth;

		this.AvAilAbleUpdAte.updAteFilePAth = pAth.join(cAchePAth, `CodeSetup-${product.quAlity}-${updAte.version}.flAg`);

		AwAit pfs.writeFile(this.AvAilAbleUpdAte.updAteFilePAth, 'flAg');
		const child = spAwn(this.AvAilAbleUpdAte.pAckAgePAth, ['/verysilent', `/updAte="${this.AvAilAbleUpdAte.updAteFilePAth}"`, '/nocloseApplicAtions', '/mergetAsks=runcode,!desktopicon,!quicklAunchicon'], {
			detAched: true,
			stdio: ['ignore', 'ignore', 'ignore'],
			windowsVerbAtimArguments: true
		});

		child.once('exit', () => {
			this.AvAilAbleUpdAte = undefined;
			this.setStAte(StAte.Idle(getUpdAteType()));
		});

		const reAdyMutexNAme = `${product.win32MutexNAme}-reAdy`;
		const mutex = AwAit import('windows-mutex');

		// poll for mutex-reAdy
		pollUntil(() => mutex.isActive(reAdyMutexNAme))
			.then(() => this.setStAte(StAte.ReAdy(updAte)));
	}

	protected doQuitAndInstAll(): void {
		if (this.stAte.type !== StAteType.ReAdy || !this.AvAilAbleUpdAte) {
			return;
		}

		this.logService.trAce('updAte#quitAndInstAll(): running rAw#quitAndInstAll()');

		if (this.stAte.updAte.supportsFAstUpdAte && this.AvAilAbleUpdAte.updAteFilePAth) {
			fs.unlinkSync(this.AvAilAbleUpdAte.updAteFilePAth);
		} else {
			spAwn(this.AvAilAbleUpdAte.pAckAgePAth, ['/silent', '/mergetAsks=runcode,!desktopicon,!quicklAunchicon'], {
				detAched: true,
				stdio: ['ignore', 'ignore', 'ignore']
			});
		}
	}

	protected getUpdAteType(): UpdAteType {
		return getUpdAteType();
	}
}
