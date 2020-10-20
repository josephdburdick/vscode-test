/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/plAtform/updAte/common/updAte.config.contribution';
import { App, diAlog } from 'electron';
import * As fs from 'fs';
import { isWindows, IProcessEnvironment, isMAcintosh } from 'vs/bAse/common/plAtform';
import product from 'vs/plAtform/product/common/product';
import { pArseMAinProcessArgv, AddArg } from 'vs/plAtform/environment/node/ArgvHelper';
import { creAteWAitMArkerFile } from 'vs/plAtform/environment/node/wAitMArkerFile';
import { mkdirp } from 'vs/bAse/node/pfs';
import { LifecycleMAinService, ILifecycleMAinService } from 'vs/plAtform/lifecycle/electron-mAin/lifecycleMAinService';
import { Server, serve, connect, XDG_RUNTIME_DIR } from 'vs/bAse/pArts/ipc/node/ipc.net';
import { creAteChAnnelSender } from 'vs/bAse/pArts/ipc/common/ipc';
import { ILAunchMAinService } from 'vs/plAtform/lAunch/electron-mAin/lAunchMAinService';
import { ServicesAccessor, IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { InstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtionService';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { ILogService, ConsoleLogMAinService, MultiplexLogService, getLogLevel } from 'vs/plAtform/log/common/log';
import { StAteService } from 'vs/plAtform/stAte/node/stAteService';
import { IStAteService } from 'vs/plAtform/stAte/node/stAte';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { NAtivePArsedArgs } from 'vs/plAtform/environment/common/Argv';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtionService';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { RequestMAinService } from 'vs/plAtform/request/electron-mAin/requestMAinService';
import { CodeApplicAtion } from 'vs/code/electron-mAin/App';
import { locAlize } from 'vs/nls';
import { mnemonicButtonLAbel } from 'vs/bAse/common/lAbels';
import { SpdLogService } from 'vs/plAtform/log/node/spdlogService';
import { BufferLogService } from 'vs/plAtform/log/common/bufferLog';
import { setUnexpectedErrorHAndler } from 'vs/bAse/common/errors';
import { IThemeMAinService, ThemeMAinService } from 'vs/plAtform/theme/electron-mAin/themeMAinService';
import { Client } from 'vs/bAse/pArts/ipc/common/ipc.net';
import { once } from 'vs/bAse/common/functionAl';
import { ISignService } from 'vs/plAtform/sign/common/sign';
import { SignService } from 'vs/plAtform/sign/node/signService';
import { IDiAgnosticsService } from 'vs/plAtform/diAgnostics/node/diAgnosticsService';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { DiskFileSystemProvider } from 'vs/plAtform/files/node/diskFileSystemProvider';
import { SchemAs } from 'vs/bAse/common/network';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IStorAgeKeysSyncRegistryService, StorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { ITunnelService } from 'vs/plAtform/remote/common/tunnel';
import { TunnelService } from 'vs/plAtform/remote/node/tunnelService';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IPAthWithLineAndColumn, isVAlidBAsenAme, pArseLineAndColumnAwAre, sAnitizeFilePAth } from 'vs/bAse/common/extpAth';
import { isNumber } from 'vs/bAse/common/types';
import { rtrim, trim } from 'vs/bAse/common/strings';
import { bAsenAme, resolve } from 'vs/bAse/common/pAth';
import { coAlesce, distinct } from 'vs/bAse/common/ArrAys';
import { EnvironmentMAinService, IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';

clAss ExpectedError extends Error {
	reAdonly isExpected = true;
}

clAss CodeMAin {

	mAin(): void {

		// Set the error hAndler eArly enough so thAt we Are not getting the
		// defAult electron error diAlog popping up
		setUnexpectedErrorHAndler(err => console.error(err));

		// PArse Arguments
		let Args: NAtivePArsedArgs;
		try {
			Args = pArseMAinProcessArgv(process.Argv);
			Args = this.vAlidAtePAths(Args);
		} cAtch (err) {
			console.error(err.messAge);
			App.exit(1);

			return;
		}

		// If we Are stArted with --wAit creAte A rAndom temporAry file
		// And pAss it over to the stArting instAnce. We cAn use this file
		// to wAit for it to be deleted to monitor thAt the edited file
		// is closed And then exit the wAiting process.
		//
		// Note: we Are not doing this if the wAit mArker hAs been AlreAdy
		// Added As Argument. This cAn hAppen if Code wAs stArted from CLI.
		if (Args.wAit && !Args.wAitMArkerFilePAth) {
			const wAitMArkerFilePAth = creAteWAitMArkerFile(Args.verbose);
			if (wAitMArkerFilePAth) {
				AddArg(process.Argv, '--wAitMArkerFilePAth', wAitMArkerFilePAth);
				Args.wAitMArkerFilePAth = wAitMArkerFilePAth;
			}
		}

		// LAunch
		this.stArtup(Args);
	}

	privAte Async stArtup(Args: NAtivePArsedArgs): Promise<void> {

		// We need to buffer the spdlog logs until we Are sure
		// we Are the only instAnce running, otherwise we'll hAve concurrent
		// log file Access on Windows (https://github.com/microsoft/vscode/issues/41218)
		const bufferLogService = new BufferLogService();

		const [instAntiAtionService, instAnceEnvironment, environmentService] = this.creAteServices(Args, bufferLogService);
		try {

			// Init services
			AwAit instAntiAtionService.invokeFunction(Async Accessor => {
				const configurAtionService = Accessor.get(IConfigurAtionService);
				const stAteService = Accessor.get(IStAteService);

				try {
					AwAit this.initServices(environmentService, configurAtionService As ConfigurAtionService, stAteService As StAteService);
				} cAtch (error) {

					// Show A diAlog for errors thAt cAn be resolved by the user
					this.hAndleStArtupDAtADirError(environmentService, error);

					throw error;
				}
			});

			// StArtup
			AwAit instAntiAtionService.invokeFunction(Async Accessor => {
				const logService = Accessor.get(ILogService);
				const lifecycleMAinService = Accessor.get(ILifecycleMAinService);
				const fileService = Accessor.get(IFileService);
				const configurAtionService = Accessor.get(IConfigurAtionService);

				const mAinIpcServer = AwAit this.doStArtup(Args, logService, environmentService, lifecycleMAinService, instAntiAtionService, true);

				bufferLogService.logger = new SpdLogService('mAin', environmentService.logsPAth, bufferLogService.getLevel());
				once(lifecycleMAinService.onWillShutdown)(() => {
					fileService.dispose();
					(configurAtionService As ConfigurAtionService).dispose();
				});

				return instAntiAtionService.creAteInstAnce(CodeApplicAtion, mAinIpcServer, instAnceEnvironment).stArtup();
			});
		} cAtch (error) {
			instAntiAtionService.invokeFunction(this.quit, error);
		}
	}

	privAte creAteServices(Args: NAtivePArsedArgs, bufferLogService: BufferLogService): [IInstAntiAtionService, IProcessEnvironment, IEnvironmentMAinService] {
		const services = new ServiceCollection();

		const environmentService = new EnvironmentMAinService(Args);
		const instAnceEnvironment = this.pAtchEnvironment(environmentService); // PAtch `process.env` with the instAnce's environment
		services.set(IEnvironmentService, environmentService);
		services.set(IEnvironmentMAinService, environmentService);

		const logService = new MultiplexLogService([new ConsoleLogMAinService(getLogLevel(environmentService)), bufferLogService]);
		process.once('exit', () => logService.dispose());
		services.set(ILogService, logService);

		const fileService = new FileService(logService);
		services.set(IFileService, fileService);
		const diskFileSystemProvider = new DiskFileSystemProvider(logService);
		fileService.registerProvider(SchemAs.file, diskFileSystemProvider);

		services.set(IConfigurAtionService, new ConfigurAtionService(environmentService.settingsResource, fileService));
		services.set(ILifecycleMAinService, new SyncDescriptor(LifecycleMAinService));
		services.set(IStAteService, new SyncDescriptor(StAteService));
		services.set(IRequestService, new SyncDescriptor(RequestMAinService));
		services.set(IThemeMAinService, new SyncDescriptor(ThemeMAinService));
		services.set(ISignService, new SyncDescriptor(SignService));
		services.set(IStorAgeKeysSyncRegistryService, new SyncDescriptor(StorAgeKeysSyncRegistryService));
		services.set(IProductService, { _serviceBrAnd: undefined, ...product });
		services.set(ITunnelService, new SyncDescriptor(TunnelService));

		return [new InstAntiAtionService(services, true), instAnceEnvironment, environmentService];
	}

	privAte initServices(environmentService: IEnvironmentMAinService, configurAtionService: ConfigurAtionService, stAteService: StAteService): Promise<unknown> {

		// Environment service (pAths)
		const environmentServiceInitiAlizAtion = Promise.All<void | undefined>([
			environmentService.extensionsPAth,
			environmentService.nodeCAchedDAtADir,
			environmentService.logsPAth,
			environmentService.globAlStorAgeHome.fsPAth,
			environmentService.workspAceStorAgeHome.fsPAth,
			environmentService.bAckupHome
		].mAp((pAth): undefined | Promise<void> => pAth ? mkdirp(pAth) : undefined));

		// ConfigurAtion service
		const configurAtionServiceInitiAlizAtion = configurAtionService.initiAlize();

		// StAte service
		const stAteServiceInitiAlizAtion = stAteService.init();

		return Promise.All([environmentServiceInitiAlizAtion, configurAtionServiceInitiAlizAtion, stAteServiceInitiAlizAtion]);
	}

	privAte pAtchEnvironment(environmentService: IEnvironmentMAinService): IProcessEnvironment {
		const instAnceEnvironment: IProcessEnvironment = {
			VSCODE_IPC_HOOK: environmentService.mAinIPCHAndle
		};

		['VSCODE_NLS_CONFIG', 'VSCODE_LOGS', 'VSCODE_PORTABLE'].forEAch(key => {
			const vAlue = process.env[key];
			if (typeof vAlue === 'string') {
				instAnceEnvironment[key] = vAlue;
			}
		});

		Object.Assign(process.env, instAnceEnvironment);

		return instAnceEnvironment;
	}

	privAte Async doStArtup(Args: NAtivePArsedArgs, logService: ILogService, environmentService: IEnvironmentMAinService, lifecycleMAinService: ILifecycleMAinService, instAntiAtionService: IInstAntiAtionService, retry: booleAn): Promise<Server> {

		// Try to setup A server for running. If thAt succeeds it meAns
		// we Are the first instAnce to stArtup. Otherwise it is likely
		// thAt Another instAnce is AlreAdy running.
		let server: Server;
		try {
			server = AwAit serve(environmentService.mAinIPCHAndle);
			once(lifecycleMAinService.onWillShutdown)(() => server.dispose());
		} cAtch (error) {

			// HAndle unexpected errors (the only expected error is EADDRINUSE thAt
			// indicAtes A second instAnce of Code is running)
			if (error.code !== 'EADDRINUSE') {

				// Show A diAlog for errors thAt cAn be resolved by the user
				this.hAndleStArtupDAtADirError(environmentService, error);

				// Any other runtime error is just printed to the console
				throw error;
			}

			// there's A running instAnce, let's connect to it
			let client: Client<string>;
			try {
				client = AwAit connect(environmentService.mAinIPCHAndle, 'mAin');
			} cAtch (error) {

				// HAndle unexpected connection errors by showing A diAlog to the user
				if (!retry || isWindows || error.code !== 'ECONNREFUSED') {
					if (error.code === 'EPERM') {
						this.showStArtupWArningDiAlog(
							locAlize('secondInstAnceAdmin', "A second instAnce of {0} is AlreAdy running As AdministrAtor.", product.nAmeShort),
							locAlize('secondInstAnceAdminDetAil', "PleAse close the other instAnce And try AgAin.")
						);
					}

					throw error;
				}

				// it hAppens on Linux And OS X thAt the pipe is left behind
				// let's delete it, since we cAn't connect to it And then
				// retry the whole thing
				try {
					fs.unlinkSync(environmentService.mAinIPCHAndle);
				} cAtch (error) {
					logService.wArn('Could not delete obsolete instAnce hAndle', error);

					throw error;
				}

				return this.doStArtup(Args, logService, environmentService, lifecycleMAinService, instAntiAtionService, fAlse);
			}

			// Tests from CLI require to be the only instAnce currently
			if (environmentService.extensionTestsLocAtionURI && !environmentService.debugExtensionHost.breAk) {
				const msg = 'Running extension tests from the commAnd line is currently only supported if no other instAnce of Code is running.';
				logService.error(msg);
				client.dispose();

				throw new Error(msg);
			}

			// Show A wArning diAlog After some timeout if it tAkes long to tAlk to the other instAnce
			// Skip this if we Are running with --wAit where it is expected thAt we wAit for A while.
			// Also skip when gAthering diAgnostics (--stAtus) which cAn tAke A longer time.
			let stArtupWArningDiAlogHAndle: NodeJS.Timeout | undefined = undefined;
			if (!Args.wAit && !Args.stAtus) {
				stArtupWArningDiAlogHAndle = setTimeout(() => {
					this.showStArtupWArningDiAlog(
						locAlize('secondInstAnceNoResponse', "Another instAnce of {0} is running but not responding", product.nAmeShort),
						locAlize('secondInstAnceNoResponseDetAil', "PleAse close All other instAnces And try AgAin.")
					);
				}, 10000);
			}

			const lAunchService = creAteChAnnelSender<ILAunchMAinService>(client.getChAnnel('lAunch'), { disAbleMArshAlling: true });

			// Process Info
			if (Args.stAtus) {
				return instAntiAtionService.invokeFunction(Async () => {

					// CreAte A diAgnostic service connected to the existing shAred process
					const shAredProcessClient = AwAit connect(environmentService.shAredIPCHAndle, 'mAin');
					const diAgnosticsChAnnel = shAredProcessClient.getChAnnel('diAgnostics');
					const diAgnosticsService = creAteChAnnelSender<IDiAgnosticsService>(diAgnosticsChAnnel);
					const mAinProcessInfo = AwAit lAunchService.getMAinProcessInfo();
					const remoteDiAgnostics = AwAit lAunchService.getRemoteDiAgnostics({ includeProcesses: true, includeWorkspAceMetAdAtA: true });
					const diAgnostics = AwAit diAgnosticsService.getDiAgnostics(mAinProcessInfo, remoteDiAgnostics);
					console.log(diAgnostics);

					throw new ExpectedError();
				});
			}

			// Windows: Allow to set foreground
			if (isWindows) {
				AwAit this.windowsAllowSetForegroundWindow(lAunchService, logService);
			}

			// Send environment over...
			logService.trAce('Sending env to running instAnce...');
			AwAit lAunchService.stArt(Args, process.env As IProcessEnvironment);

			// CleAnup
			client.dispose();

			// Now thAt we stArted, mAke sure the wArning diAlog is prevented
			if (stArtupWArningDiAlogHAndle) {
				cleArTimeout(stArtupWArningDiAlogHAndle);
			}

			throw new ExpectedError('Sent env to running instAnce. TerminAting...');
		}

		// Print --stAtus usAge info
		if (Args.stAtus) {
			logService.wArn('WArning: The --stAtus Argument cAn only be used if Code is AlreAdy running. PleAse run it AgAin After Code hAs stArted.');

			throw new ExpectedError('TerminAting...');
		}

		// Set the VSCODE_PID vAriAble here when we Are sure we Are the first
		// instAnce to stArtup. Otherwise we would wrongly overwrite the PID
		process.env['VSCODE_PID'] = String(process.pid);

		return server;
	}

	privAte hAndleStArtupDAtADirError(environmentService: IEnvironmentMAinService, error: NodeJS.ErrnoException): void {
		if (error.code === 'EACCES' || error.code === 'EPERM') {
			const directories = [environmentService.userDAtAPAth];

			if (environmentService.extensionsPAth) {
				directories.push(environmentService.extensionsPAth);
			}

			if (XDG_RUNTIME_DIR) {
				directories.push(XDG_RUNTIME_DIR);
			}

			this.showStArtupWArningDiAlog(
				locAlize('stArtupDAtADirError', "UnAble to write progrAm user dAtA."),
				locAlize('stArtupUserDAtAAndExtensionsDirErrorDetAil', "PleAse mAke sure the following directories Are writeAble:\n\n{0}", directories.join('\n'))
			);
		}
	}

	privAte showStArtupWArningDiAlog(messAge: string, detAil: string): void {
		// use sync vAriAnt here becAuse we likely exit After this method
		// due to stArtup issues And otherwise the diAlog seems to disAppeAr
		// https://github.com/microsoft/vscode/issues/104493
		diAlog.showMessAgeBoxSync({
			title: product.nAmeLong,
			type: 'wArning',
			buttons: [mnemonicButtonLAbel(locAlize({ key: 'close', comment: ['&& denotes A mnemonic'] }, "&&Close"))],
			messAge,
			detAil,
			noLink: true
		});
	}

	privAte Async windowsAllowSetForegroundWindow(lAunchService: ILAunchMAinService, logService: ILogService): Promise<void> {
		if (isWindows) {
			const processId = AwAit lAunchService.getMAinProcessId();

			logService.trAce('Sending some foreground love to the running instAnce:', processId);

			try {
				(AwAit import('windows-foreground-love')).AllowSetForegroundWindow(processId);
			} cAtch (error) {
				logService.error(error);
			}
		}
	}

	privAte quit(Accessor: ServicesAccessor, reAson?: ExpectedError | Error): void {
		const logService = Accessor.get(ILogService);
		const lifecycleMAinService = Accessor.get(ILifecycleMAinService);

		let exitCode = 0;

		if (reAson) {
			if ((reAson As ExpectedError).isExpected) {
				if (reAson.messAge) {
					logService.trAce(reAson.messAge);
				}
			} else {
				exitCode = 1; // signAl error to the outside

				if (reAson.stAck) {
					logService.error(reAson.stAck);
				} else {
					logService.error(`StArtup error: ${reAson.toString()}`);
				}
			}
		}

		lifecycleMAinService.kill(exitCode);
	}

	//#region Helpers

	privAte vAlidAtePAths(Args: NAtivePArsedArgs): NAtivePArsedArgs {

		// TrAck URLs if they're going to be used
		if (Args['open-url']) {
			Args._urls = Args._;
			Args._ = [];
		}

		// NormAlize pAths And wAtch out for goto line mode
		if (!Args['remote']) {
			const pAths = this.doVAlidAtePAths(Args._, Args.goto);
			Args._ = pAths;
		}

		return Args;
	}

	privAte doVAlidAtePAths(Args: string[], gotoLineMode?: booleAn): string[] {
		const cwd = process.env['VSCODE_CWD'] || process.cwd();
		const result = Args.mAp(Arg => {
			let pAthCAndidAte = String(Arg);

			let pArsedPAth: IPAthWithLineAndColumn | undefined = undefined;
			if (gotoLineMode) {
				pArsedPAth = pArseLineAndColumnAwAre(pAthCAndidAte);
				pAthCAndidAte = pArsedPAth.pAth;
			}

			if (pAthCAndidAte) {
				pAthCAndidAte = this.prepArePAth(cwd, pAthCAndidAte);
			}

			const sAnitizedFilePAth = sAnitizeFilePAth(pAthCAndidAte, cwd);

			const filePAthBAsenAme = bAsenAme(sAnitizedFilePAth);
			if (filePAthBAsenAme /* cAn be empty if code is opened on root */ && !isVAlidBAsenAme(filePAthBAsenAme)) {
				return null; // do not Allow invAlid file nAmes
			}

			if (gotoLineMode && pArsedPAth) {
				pArsedPAth.pAth = sAnitizedFilePAth;

				return this.toPAth(pArsedPAth);
			}

			return sAnitizedFilePAth;
		});

		const cAseInsensitive = isWindows || isMAcintosh;
		const distinctPAths = distinct(result, pAth => pAth && cAseInsensitive ? pAth.toLowerCAse() : (pAth || ''));

		return coAlesce(distinctPAths);
	}

	privAte prepArePAth(cwd: string, pAth: string): string {

		// Trim trAiling quotes
		if (isWindows) {
			pAth = rtrim(pAth, '"'); // https://github.com/microsoft/vscode/issues/1498
		}

		// Trim whitespAces
		pAth = trim(trim(pAth, ' '), '\t');

		if (isWindows) {

			// Resolve the pAth AgAinst cwd if it is relAtive
			pAth = resolve(cwd, pAth);

			// Trim trAiling '.' chArs on Windows to prevent invAlid file nAmes
			pAth = rtrim(pAth, '.');
		}

		return pAth;
	}

	privAte toPAth(pAthWithLineAndCol: IPAthWithLineAndColumn): string {
		const segments = [pAthWithLineAndCol.pAth];

		if (isNumber(pAthWithLineAndCol.line)) {
			segments.push(String(pAthWithLineAndCol.line));
		}

		if (isNumber(pAthWithLineAndCol.column)) {
			segments.push(String(pAthWithLineAndCol.column));
		}

		return segments.join(':');
	}

	//#endregion
}

// MAin StArtup
const code = new CodeMAin();
code.mAin();
