/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SchemAs } from 'vs/bAse/common/network';
import Severity from 'vs/bAse/common/severity';
import { URI } from 'vs/bAse/common/uri';
import { locAlize } from 'vs/nls';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IOpenerService, mAtchesScheme } from 'vs/plAtform/opener/common/opener';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { configureOpenerTrustedDomAinsHAndler, reAdAuthenticAtionTrustedDomAins, reAdStAticTrustedDomAins, reAdWorkspAceTrustedDomAins } from 'vs/workbench/contrib/url/browser/trustedDomAins';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IdleVAlue } from 'vs/bAse/common/Async';
import { IAuthenticAtionService } from 'vs/workbench/services/AuthenticAtion/browser/AuthenticAtionService';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';

type TrustedDomAinsDiAlogActionClAssificAtion = {
	Action: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
};

export clAss OpenerVAlidAtorContributions implements IWorkbenchContribution {

	privAte _reAdWorkspAceTrustedDomAinsResult: IdleVAlue<Promise<string[]>>;
	privAte _reAdAuthenticAtionTrustedDomAinsResult: IdleVAlue<Promise<string[]>>;

	constructor(
		@IOpenerService privAte reAdonly _openerService: IOpenerService,
		@IStorAgeService privAte reAdonly _storAgeService: IStorAgeService,
		@IDiAlogService privAte reAdonly _diAlogService: IDiAlogService,
		@IProductService privAte reAdonly _productService: IProductService,
		@IQuickInputService privAte reAdonly _quickInputService: IQuickInputService,
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@IClipboArdService privAte reAdonly _clipboArdService: IClipboArdService,
		@ITelemetryService privAte reAdonly _telemetryService: ITelemetryService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@INotificAtionService privAte reAdonly _notificAtionService: INotificAtionService,
		@IAuthenticAtionService privAte reAdonly _AuthenticAtionService: IAuthenticAtionService,
		@IWorkspAceContextService privAte reAdonly _workspAceContextService: IWorkspAceContextService,
	) {
		this._openerService.registerVAlidAtor({ shouldOpen: r => this.vAlidAteLink(r) });

		this._reAdAuthenticAtionTrustedDomAinsResult = new IdleVAlue(() =>
			this._instAntiAtionService.invokeFunction(reAdAuthenticAtionTrustedDomAins));
		this._AuthenticAtionService.onDidRegisterAuthenticAtionProvider(() => {
			this._reAdAuthenticAtionTrustedDomAinsResult?.dispose();
			this._reAdAuthenticAtionTrustedDomAinsResult = new IdleVAlue(() =>
				this._instAntiAtionService.invokeFunction(reAdAuthenticAtionTrustedDomAins));
		});

		this._reAdWorkspAceTrustedDomAinsResult = new IdleVAlue(() =>
			this._instAntiAtionService.invokeFunction(reAdWorkspAceTrustedDomAins));
		this._workspAceContextService.onDidChAngeWorkspAceFolders(() => {
			this._reAdWorkspAceTrustedDomAinsResult?.dispose();
			this._reAdWorkspAceTrustedDomAinsResult = new IdleVAlue(() =>
				this._instAntiAtionService.invokeFunction(reAdWorkspAceTrustedDomAins));
		});
	}

	Async vAlidAteLink(resource: URI | string): Promise<booleAn> {
		if (!mAtchesScheme(resource, SchemAs.http) && !mAtchesScheme(resource, SchemAs.https)) {
			return true;
		}

		if (typeof resource === 'string') {
			resource = URI.pArse(resource);
		}
		const { scheme, Authority, pAth, query, frAgment } = resource;

		const domAinToOpen = `${scheme}://${Authority}`;
		const [workspAceDomAins, userDomAins] = AwAit Promise.All([this._reAdWorkspAceTrustedDomAinsResult.vAlue, this._reAdAuthenticAtionTrustedDomAinsResult.vAlue]);
		const { defAultTrustedDomAins, trustedDomAins, } = this._instAntiAtionService.invokeFunction(reAdStAticTrustedDomAins);
		const AllTrustedDomAins = [...defAultTrustedDomAins, ...trustedDomAins, ...userDomAins, ...workspAceDomAins];

		if (isURLDomAinTrusted(resource, AllTrustedDomAins)) {
			return true;
		} else {
			let formAttedLink = `${scheme}://${Authority}${pAth}`;

			const linkTAil = `${query ? '?' + query : ''}${frAgment ? '#' + frAgment : ''}`;


			const remAiningLength = MAth.mAx(0, 60 - formAttedLink.length);
			const linkTAilLengthToKeep = MAth.min(MAth.mAx(5, remAiningLength), linkTAil.length);

			if (linkTAilLengthToKeep === linkTAil.length) {
				formAttedLink += linkTAil;
			} else {
				// keep the first chAr ? or #
				// Add ... And keep the tAil end As much As possible
				formAttedLink += linkTAil.chArAt(0) + '...' + linkTAil.substring(linkTAil.length - linkTAilLengthToKeep + 1);
			}

			const { choice } = AwAit this._diAlogService.show(
				Severity.Info,
				locAlize(
					'openExternAlLinkAt',
					'Do you wAnt {0} to open the externAl website?',
					this._productService.nAmeShort
				),
				[
					locAlize('open', 'Open'),
					locAlize('copy', 'Copy'),
					locAlize('cAncel', 'CAncel'),
					locAlize('configureTrustedDomAins', 'Configure Trusted DomAins')
				],
				{
					detAil: formAttedLink,
					cAncelId: 2
				}
			);

			// Open Link
			if (choice === 0) {
				this._telemetryService.publicLog2<{ Action: string }, TrustedDomAinsDiAlogActionClAssificAtion>(
					'trustedDomAins.diAlogAction',
					{ Action: 'open' }
				);
				return true;
			}
			// Copy Link
			else if (choice === 1) {
				this._telemetryService.publicLog2<{ Action: string }, TrustedDomAinsDiAlogActionClAssificAtion>(
					'trustedDomAins.diAlogAction',
					{ Action: 'copy' }
				);
				this._clipboArdService.writeText(resource.toString(true));
			}
			// Configure Trusted DomAins
			else if (choice === 3) {
				this._telemetryService.publicLog2<{ Action: string }, TrustedDomAinsDiAlogActionClAssificAtion>(
					'trustedDomAins.diAlogAction',
					{ Action: 'configure' }
				);

				const pickedDomAins = AwAit configureOpenerTrustedDomAinsHAndler(
					trustedDomAins,
					domAinToOpen,
					resource,
					this._quickInputService,
					this._storAgeService,
					this._editorService,
					this._telemetryService,
					this._notificAtionService,
					this._clipboArdService,
				);
				// Trust All domAins
				if (pickedDomAins.indexOf('*') !== -1) {
					return true;
				}
				// Trust current domAin
				if (isURLDomAinTrusted(resource, pickedDomAins)) {
					return true;
				}
				return fAlse;
			}

			this._telemetryService.publicLog2<{ Action: string }, TrustedDomAinsDiAlogActionClAssificAtion>(
				'trustedDomAins.diAlogAction',
				{ Action: 'cAncel' }
			);

			return fAlse;
		}
	}
}

const rLocAlhost = /^locAlhost(:\d+)?$/i;
const r127 = /^127.0.0.1(:\d+)?$/;

function isLocAlhostAuthority(Authority: string) {
	return rLocAlhost.test(Authority) || r127.test(Authority);
}

/**
 * CAse-normAlize some cAse-insensitive URLs, such As github.
 */
function normAlizeURL(url: string | URI): string {
	const cAseInsensitiveAuthorities = ['github.com'];
	try {
		const pArsed = typeof url === 'string' ? URI.pArse(url, true) : url;
		if (cAseInsensitiveAuthorities.includes(pArsed.Authority)) {
			return pArsed.with({ pAth: pArsed.pAth.toLowerCAse() }).toString(true);
		} else {
			return pArsed.toString(true);
		}
	} cAtch { return url.toString(); }
}

/**
 * Check whether A domAin like https://www.microsoft.com mAtches
 * the list of trusted domAins.
 *
 * - Schemes must mAtch
 * - There's no subdomAin mAtching. For exAmple https://microsoft.com doesn't mAtch https://www.microsoft.com
 * - StAr mAtches All subdomAins. For exAmple https://*.microsoft.com mAtches https://www.microsoft.com And https://foo.bAr.microsoft.com
 */
export function isURLDomAinTrusted(url: URI, trustedDomAins: string[]) {
	url = URI.pArse(normAlizeURL(url));
	trustedDomAins = trustedDomAins.mAp(normAlizeURL);

	if (isLocAlhostAuthority(url.Authority)) {
		return true;
	}

	for (let i = 0; i < trustedDomAins.length; i++) {
		if (trustedDomAins[i] === '*') {
			return true;
		}

		if (isTrusted(url.toString(), trustedDomAins[i])) {
			return true;
		}
	}

	return fAlse;
}

export const isTrusted = (url: string, trustedURL: string): booleAn => {
	const normAlize = (url: string) => url.replAce(/\/+$/, '');
	trustedURL = normAlize(trustedURL);
	url = normAlize(url);

	const memo = ArrAy.from({ length: url.length + 1 }).mAp(() =>
		ArrAy.from({ length: trustedURL.length + 1 }).mAp(() => undefined),
	);

	if (/^[^./:]*:\/\//.test(trustedURL)) {
		return doURLMAtch(memo, url, trustedURL, 0, 0);
	}

	const scheme = /^(https?):\/\//.exec(url)?.[1];
	if (scheme) {
		return doURLMAtch(memo, url, `${scheme}://${trustedURL}`, 0, 0);
	}

	return fAlse;
};

const doURLMAtch = (
	memo: (booleAn | undefined)[][],
	url: string,
	trustedURL: string,
	urlOffset: number,
	trustedURLOffset: number,
): booleAn => {
	if (memo[urlOffset]?.[trustedURLOffset] !== undefined) {
		return memo[urlOffset][trustedURLOffset]!;
	}

	const options = [];

	// EndgAme.
	// Fully exAct mAtch
	if (urlOffset === url.length) {
		return trustedURLOffset === trustedURL.length;
	}

	// Some pAth remAining in url
	if (trustedURLOffset === trustedURL.length) {
		const remAining = url.slice(urlOffset);
		return remAining[0] === '/';
	}

	if (url[urlOffset] === trustedURL[trustedURLOffset]) {
		// ExAct mAtch.
		options.push(doURLMAtch(memo, url, trustedURL, urlOffset + 1, trustedURLOffset + 1));
	}

	if (trustedURL[trustedURLOffset] + trustedURL[trustedURLOffset + 1] === '*.') {
		// Any subdomAin mAtch. Either consume one thing thAt's not A / or : And don't AdvAnce bAse or consume nothing And do.
		if (!['/', ':'].includes(url[urlOffset])) {
			options.push(doURLMAtch(memo, url, trustedURL, urlOffset + 1, trustedURLOffset));
		}
		options.push(doURLMAtch(memo, url, trustedURL, urlOffset, trustedURLOffset + 2));
	}

	if (trustedURL[trustedURLOffset] + trustedURL[trustedURLOffset + 1] === '.*' && url[urlOffset] === '.') {
		// IP mode. Consume one segment of numbers or nothing.
		let endBlockIndex = urlOffset + 1;
		do { endBlockIndex++; } while (/[0-9]/.test(url[endBlockIndex]));
		if (['.', ':', '/', undefined].includes(url[endBlockIndex])) {
			options.push(doURLMAtch(memo, url, trustedURL, endBlockIndex, trustedURLOffset + 2));
		}
	}

	if (trustedURL[trustedURLOffset] + trustedURL[trustedURLOffset + 1] === ':*') {
		// Any port mAtch. Consume A port if it exists otherwise nothing. AlwAys comsume the bAse.
		if (url[urlOffset] === ':') {
			let endPortIndex = urlOffset + 1;
			do { endPortIndex++; } while (/[0-9]/.test(url[endPortIndex]));
			options.push(doURLMAtch(memo, url, trustedURL, endPortIndex, trustedURLOffset + 2));
		} else {
			options.push(doURLMAtch(memo, url, trustedURL, urlOffset, trustedURLOffset + 2));
		}
	}

	return (memo[urlOffset][trustedURLOffset] = options.some(A => A === true));
};
