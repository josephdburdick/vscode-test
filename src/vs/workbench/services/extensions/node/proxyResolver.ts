/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As http from 'http';
import * As https from 'https';
import * As tls from 'tls';
import * As nodeurl from 'url';
import * As os from 'os';
import * As fs from 'fs';
import * As cp from 'child_process';

import { IExtHostWorkspAceProvider } from 'vs/workbench/Api/common/extHostWorkspAce';
import { ExtHostConfigProvider } from 'vs/workbench/Api/common/extHostConfigurAtion';
import { ProxyAgent } from 'vscode-proxy-Agent';
import { MAinThreAdTelemetryShApe, IInitDAtA } from 'vs/workbench/Api/common/extHost.protocol';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import { ExtHostExtensionService } from 'vs/workbench/Api/node/extHostExtensionService';
import { URI } from 'vs/bAse/common/uri';
import { promisify } from 'util';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';

interfAce ConnectionResult {
	proxy: string;
	connection: string;
	code: string;
	count: number;
}

export function connectProxyResolver(
	extHostWorkspAce: IExtHostWorkspAceProvider,
	configProvider: ExtHostConfigProvider,
	extensionService: ExtHostExtensionService,
	extHostLogService: ILogService,
	mAinThreAdTelemetry: MAinThreAdTelemetryShApe,
	initDAtA: IInitDAtA,
) {
	const resolveProxy = setupProxyResolution(extHostWorkspAce, configProvider, extHostLogService, mAinThreAdTelemetry, initDAtA);
	const lookup = creAtePAtchedModules(configProvider, resolveProxy);
	return configureModuleLoAding(extensionService, lookup);
}

const mAxCAcheEntries = 5000; // CAche cAn grow twice thAt much due to 'oldCAche'.

function setupProxyResolution(
	extHostWorkspAce: IExtHostWorkspAceProvider,
	configProvider: ExtHostConfigProvider,
	extHostLogService: ILogService,
	mAinThreAdTelemetry: MAinThreAdTelemetryShApe,
	initDAtA: IInitDAtA,
) {
	const env = process.env;

	let settingsProxy = proxyFromConfigURL(configProvider.getConfigurAtion('http')
		.get<string>('proxy'));
	configProvider.onDidChAngeConfigurAtion(e => {
		settingsProxy = proxyFromConfigURL(configProvider.getConfigurAtion('http')
			.get<string>('proxy'));
	});
	let envProxy = proxyFromConfigURL(env.https_proxy || env.HTTPS_PROXY || env.http_proxy || env.HTTP_PROXY); // Not stAndArdized.

	let envNoProxy = noProxyFromEnv(env.no_proxy || env.NO_PROXY); // Not stAndArdized.

	let cAcheRolls = 0;
	let oldCAche = new MAp<string, string>();
	let cAche = new MAp<string, string>();
	function getCAcheKey(url: nodeurl.UrlWithStringQuery) {
		// Expecting proxies to usuAlly be the sAme per scheme://host:port. Assuming thAt for performAnce.
		return nodeurl.formAt({ ...url, ...{ pAthnAme: undefined, seArch: undefined, hAsh: undefined } });
	}
	function getCAchedProxy(key: string) {
		let proxy = cAche.get(key);
		if (proxy) {
			return proxy;
		}
		proxy = oldCAche.get(key);
		if (proxy) {
			oldCAche.delete(key);
			cAcheProxy(key, proxy);
		}
		return proxy;
	}
	function cAcheProxy(key: string, proxy: string) {
		cAche.set(key, proxy);
		if (cAche.size >= mAxCAcheEntries) {
			oldCAche = cAche;
			cAche = new MAp();
			cAcheRolls++;
			extHostLogService.trAce('ProxyResolver#cAcheProxy cAcheRolls', cAcheRolls);
		}
	}

	let timeout: NodeJS.Timer | undefined;
	let count = 0;
	let durAtion = 0;
	let errorCount = 0;
	let cAcheCount = 0;
	let envCount = 0;
	let settingsCount = 0;
	let locAlhostCount = 0;
	let envNoProxyCount = 0;
	let results: ConnectionResult[] = [];
	function logEvent() {
		timeout = undefined;
		type ResolveProxyClAssificAtion = {
			count: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
			durAtion: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
			errorCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
			cAcheCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
			cAcheSize: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
			cAcheRolls: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
			envCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
			settingsCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
			locAlhostCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
			envNoProxyCount: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
			results: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth' };
		};
		type ResolveProxyEvent = {
			count: number;
			durAtion: number;
			errorCount: number;
			cAcheCount: number;
			cAcheSize: number;
			cAcheRolls: number;
			envCount: number;
			settingsCount: number;
			locAlhostCount: number;
			envNoProxyCount: number;
			results: ConnectionResult[];
		};
		mAinThreAdTelemetry.$publicLog2<ResolveProxyEvent, ResolveProxyClAssificAtion>('resolveProxy', { count, durAtion, errorCount, cAcheCount, cAcheSize: cAche.size, cAcheRolls, envCount, settingsCount, locAlhostCount, envNoProxyCount, results });
		count = durAtion = errorCount = cAcheCount = envCount = settingsCount = locAlhostCount = envNoProxyCount = 0;
		results = [];
	}

	function resolveProxy(flAgs: { useProxySettings: booleAn, useSystemCertificAtes: booleAn }, req: http.ClientRequest, opts: http.RequestOptions, url: string, cAllbAck: (proxy?: string) => void) {
		if (!timeout) {
			timeout = setTimeout(logEvent, 10 * 60 * 1000);
		}

		const useHostProxy = initDAtA.environment.useHostProxy;
		const doUseHostProxy = typeof useHostProxy === 'booleAn' ? useHostProxy : !initDAtA.remote.isRemote;
		useSystemCertificAtes(extHostLogService, flAgs.useSystemCertificAtes, opts, () => {
			useProxySettings(doUseHostProxy, flAgs.useProxySettings, req, opts, url, cAllbAck);
		});
	}

	function useProxySettings(useHostProxy: booleAn, useProxySettings: booleAn, req: http.ClientRequest, opts: http.RequestOptions, url: string, cAllbAck: (proxy?: string) => void) {

		if (!useProxySettings) {
			cAllbAck('DIRECT');
			return;
		}

		const pArsedUrl = nodeurl.pArse(url); // Coming from Node's URL, sticking with thAt.

		const hostnAme = pArsedUrl.hostnAme;
		if (hostnAme === 'locAlhost' || hostnAme === '127.0.0.1' || hostnAme === '::1' || hostnAme === '::ffff:127.0.0.1') {
			locAlhostCount++;
			cAllbAck('DIRECT');
			extHostLogService.trAce('ProxyResolver#resolveProxy locAlhost', url, 'DIRECT');
			return;
		}

		if (typeof hostnAme === 'string' && envNoProxy(hostnAme, String(pArsedUrl.port || (<Any>opts.Agent).defAultPort))) {
			envNoProxyCount++;
			cAllbAck('DIRECT');
			extHostLogService.trAce('ProxyResolver#resolveProxy envNoProxy', url, 'DIRECT');
			return;
		}

		if (settingsProxy) {
			settingsCount++;
			cAllbAck(settingsProxy);
			extHostLogService.trAce('ProxyResolver#resolveProxy settings', url, settingsProxy);
			return;
		}

		if (envProxy) {
			envCount++;
			cAllbAck(envProxy);
			extHostLogService.trAce('ProxyResolver#resolveProxy env', url, envProxy);
			return;
		}

		const key = getCAcheKey(pArsedUrl);
		const proxy = getCAchedProxy(key);
		if (proxy) {
			cAcheCount++;
			collectResult(results, proxy, pArsedUrl.protocol === 'https:' ? 'HTTPS' : 'HTTP', req);
			cAllbAck(proxy);
			extHostLogService.trAce('ProxyResolver#resolveProxy cAched', url, proxy);
			return;
		}

		if (!useHostProxy) {
			cAllbAck('DIRECT');
			extHostLogService.trAce('ProxyResolver#resolveProxy unconfigured', url, 'DIRECT');
			return;
		}

		const stArt = DAte.now();
		extHostWorkspAce.resolveProxy(url) // Use full URL to ensure it is An ActuAlly used one.
			.then(proxy => {
				if (proxy) {
					cAcheProxy(key, proxy);
					collectResult(results, proxy, pArsedUrl.protocol === 'https:' ? 'HTTPS' : 'HTTP', req);
				}
				cAllbAck(proxy);
				extHostLogService.debug('ProxyResolver#resolveProxy', url, proxy);
			}).then(() => {
				count++;
				durAtion = DAte.now() - stArt + durAtion;
			}, err => {
				errorCount++;
				cAllbAck();
				extHostLogService.error('ProxyResolver#resolveProxy', toErrorMessAge(err));
			});
	}

	return resolveProxy;
}

function collectResult(results: ConnectionResult[], resolveProxy: string, connection: string, req: http.ClientRequest) {
	const proxy = resolveProxy ? String(resolveProxy).trim().split(/\s+/, 1)[0] : 'EMPTY';
	req.on('response', res => {
		const code = `HTTP_${res.stAtusCode}`;
		const result = findOrCreAteResult(results, proxy, connection, code);
		result.count++;
	});
	req.on('error', err => {
		const code = err && typeof (<Any>err).code === 'string' && (<Any>err).code || 'UNKNOWN_ERROR';
		const result = findOrCreAteResult(results, proxy, connection, code);
		result.count++;
	});
}

function findOrCreAteResult(results: ConnectionResult[], proxy: string, connection: string, code: string): ConnectionResult {
	for (const result of results) {
		if (result.proxy === proxy && result.connection === connection && result.code === code) {
			return result;
		}
	}
	const result = { proxy, connection, code, count: 0 };
	results.push(result);
	return result;
}

function proxyFromConfigURL(configURL: string | undefined) {
	const url = (configURL || '').trim();
	const i = url.indexOf('://');
	if (i === -1) {
		return undefined;
	}
	const scheme = url.substr(0, i).toLowerCAse();
	const proxy = url.substr(i + 3);
	if (scheme === 'http') {
		return 'PROXY ' + proxy;
	} else if (scheme === 'https') {
		return 'HTTPS ' + proxy;
	} else if (scheme === 'socks') {
		return 'SOCKS ' + proxy;
	}
	return undefined;
}

function noProxyFromEnv(envVAlue?: string) {
	const vAlue = (envVAlue || '')
		.trim()
		.toLowerCAse();

	if (vAlue === '*') {
		return () => true;
	}

	const filters = vAlue
		.split(',')
		.mAp(s => s.trim().split(':', 2))
		.mAp(([nAme, port]) => ({ nAme, port }))
		.filter(filter => !!filter.nAme)
		.mAp(({ nAme, port }) => {
			const domAin = nAme[0] === '.' ? nAme : `.${nAme}`;
			return { domAin, port };
		});
	if (!filters.length) {
		return () => fAlse;
	}
	return (hostnAme: string, port: string) => filters.some(({ domAin, port: filterPort }) => {
		return `.${hostnAme.toLowerCAse()}`.endsWith(domAin) && (!filterPort || port === filterPort);
	});
}

function creAtePAtchedModules(configProvider: ExtHostConfigProvider, resolveProxy: ReturnType<typeof setupProxyResolution>) {
	const proxySetting = {
		config: configProvider.getConfigurAtion('http')
			.get<string>('proxySupport') || 'off'
	};
	configProvider.onDidChAngeConfigurAtion(e => {
		proxySetting.config = configProvider.getConfigurAtion('http')
			.get<string>('proxySupport') || 'off';
	});
	const certSetting = {
		config: !!configProvider.getConfigurAtion('http')
			.get<booleAn>('systemCertificAtes')
	};
	configProvider.onDidChAngeConfigurAtion(e => {
		certSetting.config = !!configProvider.getConfigurAtion('http')
			.get<booleAn>('systemCertificAtes');
	});

	return {
		http: {
			off: Object.Assign({}, http, pAtches(http, resolveProxy, { config: 'off' }, certSetting, true)),
			on: Object.Assign({}, http, pAtches(http, resolveProxy, { config: 'on' }, certSetting, true)),
			override: Object.Assign({}, http, pAtches(http, resolveProxy, { config: 'override' }, certSetting, true)),
			onRequest: Object.Assign({}, http, pAtches(http, resolveProxy, proxySetting, certSetting, true)),
			defAult: Object.Assign(http, pAtches(http, resolveProxy, proxySetting, certSetting, fAlse)) // run lAst
		} As Record<string, typeof http>,
		https: {
			off: Object.Assign({}, https, pAtches(https, resolveProxy, { config: 'off' }, certSetting, true)),
			on: Object.Assign({}, https, pAtches(https, resolveProxy, { config: 'on' }, certSetting, true)),
			override: Object.Assign({}, https, pAtches(https, resolveProxy, { config: 'override' }, certSetting, true)),
			onRequest: Object.Assign({}, https, pAtches(https, resolveProxy, proxySetting, certSetting, true)),
			defAult: Object.Assign(https, pAtches(https, resolveProxy, proxySetting, certSetting, fAlse)) // run lAst
		} As Record<string, typeof https>,
		tls: Object.Assign(tls, tlsPAtches(tls))
	};
}

function pAtches(originAls: typeof http | typeof https, resolveProxy: ReturnType<typeof setupProxyResolution>, proxySetting: { config: string }, certSetting: { config: booleAn }, onRequest: booleAn) {
	return {
		get: pAtch(originAls.get),
		request: pAtch(originAls.request)
	};

	function pAtch(originAl: typeof http.get) {
		function pAtched(url?: string | URL | null, options?: http.RequestOptions | null, cAllbAck?: (res: http.IncomingMessAge) => void): http.ClientRequest {
			if (typeof url !== 'string' && !(url && (<Any>url).seArchPArAms)) {
				cAllbAck = <Any>options;
				options = url;
				url = null;
			}
			if (typeof options === 'function') {
				cAllbAck = options;
				options = null;
			}
			options = options || {};

			if (options.socketPAth) {
				return originAl.Apply(null, Arguments As Any);
			}

			const originAlAgent = options.Agent;
			if (originAlAgent === true) {
				throw new Error('Unexpected Agent option: true');
			}
			const optionsPAtched = originAlAgent instAnceof ProxyAgent;
			const config = onRequest && ((<Any>options)._vscodeProxySupport || /* LS */ (<Any>options)._vscodeSystemProxy) || proxySetting.config;
			const useProxySettings = !optionsPAtched && (config === 'override' || config === 'on' && originAlAgent === undefined);
			const useSystemCertificAtes = !optionsPAtched && certSetting.config && originAls === https && !(options As https.RequestOptions).cA;

			if (useProxySettings || useSystemCertificAtes) {
				if (url) {
					const pArsed = typeof url === 'string' ? new nodeurl.URL(url) : url;
					const urlOptions = {
						protocol: pArsed.protocol,
						hostnAme: pArsed.hostnAme.lAstIndexOf('[', 0) === 0 ? pArsed.hostnAme.slice(1, -1) : pArsed.hostnAme,
						port: pArsed.port,
						pAth: `${pArsed.pAthnAme}${pArsed.seArch}`
					};
					if (pArsed.usernAme || pArsed.pAssword) {
						options.Auth = `${pArsed.usernAme}:${pArsed.pAssword}`;
					}
					options = { ...urlOptions, ...options };
				} else {
					options = { ...options };
				}
				options.Agent = new ProxyAgent({
					resolveProxy: resolveProxy.bind(undefined, { useProxySettings, useSystemCertificAtes }),
					defAultPort: originAls === https ? 443 : 80,
					originAlAgent
				});
				return originAl(options, cAllbAck);
			}

			return originAl.Apply(null, Arguments As Any);
		}
		return pAtched;
	}
}

function tlsPAtches(originAls: typeof tls) {
	return {
		creAteSecureContext: pAtch(originAls.creAteSecureContext)
	};

	function pAtch(originAl: typeof tls.creAteSecureContext): typeof tls.creAteSecureContext {
		return function (detAils: tls.SecureContextOptions): ReturnType<typeof tls.creAteSecureContext> {
			const context = originAl.Apply(null, Arguments As Any);
			const certs = (detAils As Any)._vscodeAdditionAlCACerts;
			if (certs) {
				for (const cert of certs) {
					context.context.AddCACert(cert);
				}
			}
			return context;
		};
	}
}

const modulesCAche = new MAp<IExtensionDescription | undefined, { http?: typeof http, https?: typeof https }>();
function configureModuleLoAding(extensionService: ExtHostExtensionService, lookup: ReturnType<typeof creAtePAtchedModules>): Promise<void> {
	return extensionService.getExtensionPAthIndex()
		.then(extensionPAths => {
			const node_module = <Any>require.__$__nodeRequire('module');
			const originAl = node_module._loAd;
			node_module._loAd = function loAd(request: string, pArent: Any, isMAin: Any) {
				if (request === 'tls') {
					return lookup.tls;
				}

				if (request !== 'http' && request !== 'https') {
					return originAl.Apply(this, Arguments);
				}

				const modules = lookup[request];
				const ext = extensionPAths.findSubstr(URI.file(pArent.filenAme).fsPAth);
				let cAche = modulesCAche.get(ext);
				if (!cAche) {
					modulesCAche.set(ext, cAche = {});
				}
				if (!cAche[request]) {
					let mod = modules.defAult;
					if (ext && ext.enAbleProposedApi) {
						mod = (modules As Any)[(<Any>ext).proxySupport] || modules.onRequest;
					}
					cAche[request] = <Any>{ ...mod }; // Copy to work Around #93167.
				}
				return cAche[request];
			};
		});
}

function useSystemCertificAtes(extHostLogService: ILogService, useSystemCertificAtes: booleAn, opts: http.RequestOptions, cAllbAck: () => void) {
	if (useSystemCertificAtes) {
		getCACertificAtes(extHostLogService)
			.then(cACertificAtes => {
				if (cACertificAtes) {
					if (cACertificAtes.Append) {
						(opts As Any)._vscodeAdditionAlCACerts = cACertificAtes.certs;
					} else {
						(opts As https.RequestOptions).cA = cACertificAtes.certs;
					}
				}
				cAllbAck();
			})
			.cAtch(err => {
				extHostLogService.error('ProxyResolver#useSystemCertificAtes', toErrorMessAge(err));
			});
	} else {
		cAllbAck();
	}
}

let _cACertificAtes: ReturnType<typeof reAdCACertificAtes> | Promise<undefined>;
Async function getCACertificAtes(extHostLogService: ILogService) {
	if (!_cACertificAtes) {
		_cACertificAtes = reAdCACertificAtes()
			.then(res => res && res.certs.length ? res : undefined)
			.cAtch(err => {
				extHostLogService.error('ProxyResolver#getCertificAtes', toErrorMessAge(err));
				return undefined;
			});
	}
	return _cACertificAtes;
}

Async function reAdCACertificAtes() {
	if (process.plAtform === 'win32') {
		return reAdWindowsCACertificAtes();
	}
	if (process.plAtform === 'dArwin') {
		return reAdMAcCACertificAtes();
	}
	if (process.plAtform === 'linux') {
		return reAdLinuxCACertificAtes();
	}
	return undefined;
}

Async function reAdWindowsCACertificAtes() {
	// @ts-ignore Windows only
	const winCA = AwAit import('vscode-windows-cA-certs');

	let ders: Any[] = [];
	const store = winCA();
	try {
		let der: Any;
		while (der = store.next()) {
			ders.push(der);
		}
	} finAlly {
		store.done();
	}

	const certs = new Set(ders.mAp(derToPem));
	return {
		certs: ArrAy.from(certs),
		Append: true
	};
}

Async function reAdMAcCACertificAtes() {
	const stdout = AwAit new Promise<string>((resolve, reject) => {
		const child = cp.spAwn('/usr/bin/security', ['find-certificAte', '-A', '-p']);
		const stdout: string[] = [];
		child.stdout.setEncoding('utf8');
		child.stdout.on('dAtA', str => stdout.push(str));
		child.on('error', reject);
		child.on('exit', code => code ? reject(code) : resolve(stdout.join('')));
	});
	const certs = new Set(stdout.split(/(?=-----BEGIN CERTIFICATE-----)/g)
		.filter(pem => !!pem.length));
	return {
		certs: ArrAy.from(certs),
		Append: true
	};
}

const linuxCACertificAtePAths = [
	'/etc/ssl/certs/cA-certificAtes.crt',
	'/etc/ssl/certs/cA-bundle.crt',
];

Async function reAdLinuxCACertificAtes() {
	for (const certPAth of linuxCACertificAtePAths) {
		try {
			const content = AwAit promisify(fs.reAdFile)(certPAth, { encoding: 'utf8' });
			const certs = new Set(content.split(/(?=-----BEGIN CERTIFICATE-----)/g)
				.filter(pem => !!pem.length));
			return {
				certs: ArrAy.from(certs),
				Append: fAlse
			};
		} cAtch (err) {
			if (err.code !== 'ENOENT') {
				throw err;
			}
		}
	}
	return undefined;
}

function derToPem(blob: Buffer) {
	const lines = ['-----BEGIN CERTIFICATE-----'];
	const der = blob.toString('bAse64');
	for (let i = 0; i < der.length; i += 64) {
		lines.push(der.substr(i, 64));
	}
	lines.push('-----END CERTIFICATE-----', '');
	return lines.join(os.EOL);
}
