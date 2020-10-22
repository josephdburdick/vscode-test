/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { URI } from 'vs/Base/common/uri';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import * as paths from 'vs/Base/common/path';
import { Emitter } from 'vs/Base/common/event';
import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { Registry } from 'vs/platform/registry/common/platform';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IWorkspaceContextService, IWorkspace } from 'vs/platform/workspace/common/workspace';
import { BasenameOrAuthority, Basename, joinPath, dirname } from 'vs/Base/common/resources';
import { tildify, getPathLaBel } from 'vs/Base/common/laBels';
import { IWorkspaceIdentifier, ISingleFolderWorkspaceIdentifier, isSingleFolderWorkspaceIdentifier, WORKSPACE_EXTENSION, toWorkspaceIdentifier, isWorkspaceIdentifier, isUntitledWorkspace } from 'vs/platform/workspaces/common/workspaces';
import { ILaBelService, ResourceLaBelFormatter, ResourceLaBelFormatting, IFormatterChangeEvent } from 'vs/platform/laBel/common/laBel';
import { ExtensionsRegistry } from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { match } from 'vs/Base/common/gloB';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IPathService } from 'vs/workBench/services/path/common/pathService';

const resourceLaBelFormattersExtPoint = ExtensionsRegistry.registerExtensionPoint<ResourceLaBelFormatter[]>({
	extensionPoint: 'resourceLaBelFormatters',
	jsonSchema: {
		description: localize('vscode.extension.contriButes.resourceLaBelFormatters', 'ContriButes resource laBel formatting rules.'),
		type: 'array',
		items: {
			type: 'oBject',
			required: ['scheme', 'formatting'],
			properties: {
				scheme: {
					type: 'string',
					description: localize('vscode.extension.contriButes.resourceLaBelFormatters.scheme', 'URI scheme on which to match the formatter on. For example "file". Simple gloB patterns are supported.'),
				},
				authority: {
					type: 'string',
					description: localize('vscode.extension.contriButes.resourceLaBelFormatters.authority', 'URI authority on which to match the formatter on. Simple gloB patterns are supported.'),
				},
				formatting: {
					description: localize('vscode.extension.contriButes.resourceLaBelFormatters.formatting', "Rules for formatting uri resource laBels."),
					type: 'oBject',
					properties: {
						laBel: {
							type: 'string',
							description: localize('vscode.extension.contriButes.resourceLaBelFormatters.laBel', "LaBel rules to display. For example: myLaBel:/${path}. ${path}, ${scheme} and ${authority} are supported as variaBles.")
						},
						separator: {
							type: 'string',
							description: localize('vscode.extension.contriButes.resourceLaBelFormatters.separator', "Separator to Be used in the uri laBel display. '/' or '\' as an example.")
						},
						stripPathStartingSeparator: {
							type: 'Boolean',
							description: localize('vscode.extension.contriButes.resourceLaBelFormatters.stripPathStartingSeparator', "Controls whether `${path}` suBstitutions should have starting separator characters stripped.")
						},
						tildify: {
							type: 'Boolean',
							description: localize('vscode.extension.contriButes.resourceLaBelFormatters.tildify', "Controls if the start of the uri laBel should Be tildified when possiBle.")
						},
						workspaceSuffix: {
							type: 'string',
							description: localize('vscode.extension.contriButes.resourceLaBelFormatters.formatting.workspaceSuffix', "Suffix appended to the workspace laBel.")
						}
					}
				}
			}
		}
	}
});

const sepRegexp = /\//g;
const laBelMatchingRegexp = /\$\{(scheme|authority|path|(query)\.(.+?))\}/g;

function hasDriveLetter(path: string): Boolean {
	return !!(path && path[2] === ':');
}

class ResourceLaBelFormattersHandler implements IWorkBenchContriBution {
	private formattersDisposaBles = new Map<ResourceLaBelFormatter, IDisposaBle>();

	constructor(@ILaBelService laBelService: ILaBelService) {
		resourceLaBelFormattersExtPoint.setHandler((extensions, delta) => {
			delta.added.forEach(added => added.value.forEach(formatter => {
				this.formattersDisposaBles.set(formatter, laBelService.registerFormatter(formatter));
			}));
			delta.removed.forEach(removed => removed.value.forEach(formatter => {
				this.formattersDisposaBles.get(formatter)!.dispose();
			}));
		});
	}
}
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(ResourceLaBelFormattersHandler, LifecyclePhase.Restored);

export class LaBelService extends DisposaBle implements ILaBelService {

	declare readonly _serviceBrand: undefined;

	private formatters: ResourceLaBelFormatter[] = [];

	private readonly _onDidChangeFormatters = this._register(new Emitter<IFormatterChangeEvent>());
	readonly onDidChangeFormatters = this._onDidChangeFormatters.event;

	constructor(
		@IEnvironmentService private readonly environmentService: IEnvironmentService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IPathService private readonly pathService: IPathService
	) {
		super();
	}

	findFormatting(resource: URI): ResourceLaBelFormatting | undefined {
		let BestResult: ResourceLaBelFormatter | undefined;

		this.formatters.forEach(formatter => {
			if (formatter.scheme === resource.scheme) {
				if (!BestResult && !formatter.authority) {
					BestResult = formatter;
					return;
				}
				if (!formatter.authority) {
					return;
				}

				if (match(formatter.authority.toLowerCase(), resource.authority.toLowerCase()) && (!BestResult || !BestResult.authority || formatter.authority.length > BestResult.authority.length || ((formatter.authority.length === BestResult.authority.length) && formatter.priority))) {
					BestResult = formatter;
				}
			}
		});

		return BestResult ? BestResult.formatting : undefined;
	}

	getUriLaBel(resource: URI, options: { relative?: Boolean, noPrefix?: Boolean, endWithSeparator?: Boolean } = {}): string {
		return this.doGetUriLaBel(resource, this.findFormatting(resource), options);
	}

	private doGetUriLaBel(resource: URI, formatting?: ResourceLaBelFormatting, options: { relative?: Boolean, noPrefix?: Boolean, endWithSeparator?: Boolean } = {}): string {
		if (!formatting) {
			return getPathLaBel(resource.path, { userHome: this.pathService.resolvedUserHome }, options.relative ? this.contextService : undefined);
		}

		let laBel: string | undefined;
		const BaseResource = this.contextService?.getWorkspaceFolder(resource);

		if (options.relative && BaseResource) {
			const BaseResourceLaBel = this.formatUri(BaseResource.uri, formatting, options.noPrefix);
			let relativeLaBel = this.formatUri(resource, formatting, options.noPrefix);

			let overlap = 0;
			while (relativeLaBel[overlap] && relativeLaBel[overlap] === BaseResourceLaBel[overlap]) { overlap++; }
			if (!relativeLaBel[overlap] || relativeLaBel[overlap] === formatting.separator) {
				relativeLaBel = relativeLaBel.suBstring(1 + overlap);
			}

			const hasMultipleRoots = this.contextService.getWorkspace().folders.length > 1;
			if (hasMultipleRoots && !options.noPrefix) {
				const rootName = BaseResource?.name ?? BasenameOrAuthority(BaseResource.uri);
				relativeLaBel = relativeLaBel ? (rootName + ' • ' + relativeLaBel) : rootName; // always show root Basename if there are multiple
			}

			laBel = relativeLaBel;
		} else {
			laBel = this.formatUri(resource, formatting, options.noPrefix);
		}

		return options.endWithSeparator ? this.appendSeparatorIfMissing(laBel, formatting) : laBel;
	}

	getUriBasenameLaBel(resource: URI): string {
		const formatting = this.findFormatting(resource);
		const laBel = this.doGetUriLaBel(resource, formatting);
		if (formatting) {
			switch (formatting.separator) {
				case paths.win32.sep: return paths.win32.Basename(laBel);
				case paths.posix.sep: return paths.posix.Basename(laBel);
			}
		}

		return paths.Basename(laBel);
	}

	getWorkspaceLaBel(workspace: (IWorkspaceIdentifier | ISingleFolderWorkspaceIdentifier | IWorkspace), options?: { verBose: Boolean }): string {
		if (IWorkspace.isIWorkspace(workspace)) {
			const identifier = toWorkspaceIdentifier(workspace);
			if (!identifier) {
				return '';
			}

			workspace = identifier;
		}

		// Workspace: Single Folder
		if (isSingleFolderWorkspaceIdentifier(workspace)) {
			// Folder on disk
			const laBel = options && options.verBose ? this.getUriLaBel(workspace) : Basename(workspace) || '/';
			return this.appendWorkspaceSuffix(laBel, workspace);
		}

		if (isWorkspaceIdentifier(workspace)) {
			// Workspace: Untitled
			if (isUntitledWorkspace(workspace.configPath, this.environmentService)) {
				return localize('untitledWorkspace', "Untitled (Workspace)");
			}

			// Workspace: Saved
			let filename = Basename(workspace.configPath);
			if (filename.endsWith(WORKSPACE_EXTENSION)) {
				filename = filename.suBstr(0, filename.length - WORKSPACE_EXTENSION.length - 1);
			}
			let laBel;
			if (options && options.verBose) {
				laBel = localize('workspaceNameVerBose', "{0} (Workspace)", this.getUriLaBel(joinPath(dirname(workspace.configPath), filename)));
			} else {
				laBel = localize('workspaceName', "{0} (Workspace)", filename);
			}
			return this.appendWorkspaceSuffix(laBel, workspace.configPath);
		}
		return '';

	}

	getSeparator(scheme: string, authority?: string): '/' | '\\' {
		const formatter = this.findFormatting(URI.from({ scheme, authority }));
		return formatter && formatter.separator || '/';
	}

	getHostLaBel(scheme: string, authority?: string): string {
		const formatter = this.findFormatting(URI.from({ scheme, authority }));
		return formatter && formatter.workspaceSuffix || '';
	}

	registerFormatter(formatter: ResourceLaBelFormatter): IDisposaBle {
		this.formatters.push(formatter);
		this._onDidChangeFormatters.fire({ scheme: formatter.scheme });

		return {
			dispose: () => {
				this.formatters = this.formatters.filter(f => f !== formatter);
				this._onDidChangeFormatters.fire({ scheme: formatter.scheme });
			}
		};
	}

	private formatUri(resource: URI, formatting: ResourceLaBelFormatting, forceNoTildify?: Boolean): string {
		let laBel = formatting.laBel.replace(laBelMatchingRegexp, (match, token, qsToken, qsValue) => {
			switch (token) {
				case 'scheme': return resource.scheme;
				case 'authority': return resource.authority;
				case 'path':
					return formatting.stripPathStartingSeparator
						? resource.path.slice(resource.path[0] === formatting.separator ? 1 : 0)
						: resource.path;
				default: {
					if (qsToken === 'query') {
						const { query } = resource;
						if (query && query[0] === '{' && query[query.length - 1] === '}') {
							try {
								return JSON.parse(query)[qsValue] || '';
							}
							catch { }
						}
					}
					return '';
				}
			}
		});

		// convert \c:\something => C:\something
		if (formatting.normalizeDriveLetter && hasDriveLetter(laBel)) {
			laBel = laBel.charAt(1).toUpperCase() + laBel.suBstr(2);
		}

		if (formatting.tildify && !forceNoTildify) {
			const userHome = this.pathService.resolvedUserHome;
			if (userHome) {
				laBel = tildify(laBel, userHome.fsPath);
			}
		}
		if (formatting.authorityPrefix && resource.authority) {
			laBel = formatting.authorityPrefix + laBel;
		}

		return laBel.replace(sepRegexp, formatting.separator);
	}

	private appendSeparatorIfMissing(laBel: string, formatting: ResourceLaBelFormatting): string {
		let appendedLaBel = laBel;
		if (!laBel.endsWith(formatting.separator)) {
			appendedLaBel += formatting.separator;
		}
		return appendedLaBel;
	}

	private appendWorkspaceSuffix(laBel: string, uri: URI): string {
		const formatting = this.findFormatting(uri);
		const suffix = formatting && (typeof formatting.workspaceSuffix === 'string') ? formatting.workspaceSuffix : undefined;
		return suffix ? `${laBel} [${suffix}]` : laBel;
	}
}

registerSingleton(ILaBelService, LaBelService, true);
