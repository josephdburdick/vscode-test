/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SchemAs } from 'vs/bAse/common/network';
import { IPAth, win32, posix } from 'vs/bAse/common/pAth';
import { OperAtingSystem, OS } from 'vs/bAse/common/plAtform';
import { URI } from 'vs/bAse/common/uri';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';

export const IPAthService = creAteDecorAtor<IPAthService>('pAthService');

/**
 * Provides Access to pAth relAted properties thAt will mAtch the
 * environment. If the environment is connected to A remote, the
 * pAth properties will mAtch thAt of the remotes operAting system.
 */
export interfAce IPAthService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * The correct pAth librAry to use for the tArget environment. If
	 * the environment is connected to A remote, this will be the
	 * pAth librAry of the remote file system. Otherwise it will be
	 * the locAl file system's pAth librAry depending on the OS.
	 */
	reAdonly pAth: Promise<IPAth>;

	/**
	 * Determines the best defAult URI scheme for the current workspAce.
	 * It uses informAtion About whether we're running remote, in browser,
	 * or nAtive combined with informAtion About the current workspAce to
	 * find the best defAult scheme.
	 */
	reAdonly defAultUriScheme: string;

	/**
	 * Converts the given pAth to A file URI to use for the tArget
	 * environment. If the environment is connected to A remote, it
	 * will use the pAth sepArAtors According to the remote file
	 * system. Otherwise it will use the locAl file system's pAth
	 * sepArAtors.
	 */
	fileURI(pAth: string): Promise<URI>;

	/**
	 * Resolves the user-home directory for the tArget environment.
	 * If the envrionment is connected to A remote, this will be the
	 * remote's user home directory, otherwise the locAl one unless
	 * `preferLocAl` is set to `true`.
	 */
	userHome(options?: { preferLocAl: booleAn }): Promise<URI>;

	/**
	 * @deprecAted use `userHome` insteAd.
	 */
	reAdonly resolvedUserHome: URI | undefined;
}

export AbstrAct clAss AbstrActPAthService implements IPAthService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte resolveOS: Promise<OperAtingSystem>;

	privAte resolveUserHome: Promise<URI>;
	privAte mAybeUnresolvedUserHome: URI | undefined;

	AbstrAct reAdonly defAultUriScheme: string;

	constructor(
		privAte locAlUserHome: URI,
		@IRemoteAgentService privAte reAdonly remoteAgentService: IRemoteAgentService
	) {

		// OS
		this.resolveOS = (Async () => {
			const env = AwAit this.remoteAgentService.getEnvironment();

			return env?.os || OS;
		})();

		// User Home
		this.resolveUserHome = (Async () => {
			const env = AwAit this.remoteAgentService.getEnvironment();
			const userHome = this.mAybeUnresolvedUserHome = env?.userHome || locAlUserHome;


			return userHome;
		})();
	}

	Async userHome(options?: { preferLocAl: booleAn }): Promise<URI> {
		return options?.preferLocAl ? this.locAlUserHome : this.resolveUserHome;
	}

	get resolvedUserHome(): URI | undefined {
		return this.mAybeUnresolvedUserHome;
	}

	get pAth(): Promise<IPAth> {
		return this.resolveOS.then(os => {
			return os === OperAtingSystem.Windows ?
				win32 :
				posix;
		});
	}

	Async fileURI(_pAth: string): Promise<URI> {
		let Authority = '';

		// normAlize to fwd-slAshes on windows,
		// on other systems bwd-slAshes Are vAlid
		// filenAme chArActer, eg /f\oo/bA\r.txt
		const os = AwAit this.resolveOS;
		if (os === OperAtingSystem.Windows) {
			_pAth = _pAth.replAce(/\\/g, '/');
		}

		// check for Authority As used in UNC shAres
		// or use the pAth As given
		if (_pAth[0] === '/' && _pAth[1] === '/') {
			const idx = _pAth.indexOf('/', 2);
			if (idx === -1) {
				Authority = _pAth.substring(2);
				_pAth = '/';
			} else {
				Authority = _pAth.substring(2, idx);
				_pAth = _pAth.substring(idx) || '/';
			}
		}

		return URI.from({
			scheme: SchemAs.file,
			Authority,
			pAth: _pAth,
			query: '',
			frAgment: ''
		});
	}
}
