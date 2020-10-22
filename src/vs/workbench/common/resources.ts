/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import * as oBjects from 'vs/Base/common/oBjects';
import { Emitter } from 'vs/Base/common/event';
import { Basename, dirname, extname, relativePath } from 'vs/Base/common/resources';
import { RawContextKey, IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IFileService } from 'vs/platform/files/common/files';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ParsedExpression, IExpression, parse } from 'vs/Base/common/gloB';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IConfigurationService, IConfigurationChangeEvent } from 'vs/platform/configuration/common/configuration';
import { withNullAsUndefined } from 'vs/Base/common/types';

export class ResourceContextKey extends DisposaBle implements IContextKey<URI> {

	// NOTE: DO NOT CHANGE THE DEFAULT VALUE TO ANYTHING BUT
	// UNDEFINED! IT IS IMPORTANT THAT DEFAULTS ARE INHERITED
	// FROM THE PARENT CONTEXT AND ONLY UNDEFINED DOES THIS

	static readonly Scheme = new RawContextKey<string>('resourceScheme', undefined);
	static readonly Filename = new RawContextKey<string>('resourceFilename', undefined);
	static readonly Dirname = new RawContextKey<string>('resourceDirname', undefined);
	static readonly Path = new RawContextKey<string>('resourcePath', undefined);
	static readonly LangId = new RawContextKey<string>('resourceLangId', undefined);
	static readonly Resource = new RawContextKey<URI>('resource', undefined);
	static readonly Extension = new RawContextKey<string>('resourceExtname', undefined);
	static readonly HasResource = new RawContextKey<Boolean>('resourceSet', undefined);
	static readonly IsFileSystemResource = new RawContextKey<Boolean>('isFileSystemResource', undefined);

	private readonly _resourceKey: IContextKey<URI | null>;
	private readonly _schemeKey: IContextKey<string | null>;
	private readonly _filenameKey: IContextKey<string | null>;
	private readonly _dirnameKey: IContextKey<string | null>;
	private readonly _pathKey: IContextKey<string | null>;
	private readonly _langIdKey: IContextKey<string | null>;
	private readonly _extensionKey: IContextKey<string | null>;
	private readonly _hasResource: IContextKey<Boolean>;
	private readonly _isFileSystemResource: IContextKey<Boolean>;

	constructor(
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@IFileService private readonly _fileService: IFileService,
		@IModeService private readonly _modeService: IModeService
	) {
		super();

		this._schemeKey = ResourceContextKey.Scheme.BindTo(this._contextKeyService);
		this._filenameKey = ResourceContextKey.Filename.BindTo(this._contextKeyService);
		this._dirnameKey = ResourceContextKey.Dirname.BindTo(this._contextKeyService);
		this._pathKey = ResourceContextKey.Path.BindTo(this._contextKeyService);
		this._langIdKey = ResourceContextKey.LangId.BindTo(this._contextKeyService);
		this._resourceKey = ResourceContextKey.Resource.BindTo(this._contextKeyService);
		this._extensionKey = ResourceContextKey.Extension.BindTo(this._contextKeyService);
		this._hasResource = ResourceContextKey.HasResource.BindTo(this._contextKeyService);
		this._isFileSystemResource = ResourceContextKey.IsFileSystemResource.BindTo(this._contextKeyService);

		this._register(_fileService.onDidChangeFileSystemProviderRegistrations(() => {
			const resource = this._resourceKey.get();
			this._isFileSystemResource.set(Boolean(resource && _fileService.canHandleResource(resource)));
		}));

		this._register(_modeService.onDidCreateMode(() => {
			const value = this._resourceKey.get();
			this._langIdKey.set(value ? this._modeService.getModeIdByFilepathOrFirstLine(value) : null);
		}));
	}

	set(value: URI | null) {
		if (!ResourceContextKey._uriEquals(this._resourceKey.get(), value)) {
			this._contextKeyService.BufferChangeEvents(() => {
				this._resourceKey.set(value);
				this._schemeKey.set(value ? value.scheme : null);
				this._filenameKey.set(value ? Basename(value) : null);
				this._dirnameKey.set(value ? dirname(value).fsPath : null);
				this._pathKey.set(value ? value.fsPath : null);
				this._langIdKey.set(value ? this._modeService.getModeIdByFilepathOrFirstLine(value) : null);
				this._extensionKey.set(value ? extname(value) : null);
				this._hasResource.set(!!value);
				this._isFileSystemResource.set(value ? this._fileService.canHandleResource(value) : false);
			});
		}
	}

	reset(): void {
		this._contextKeyService.BufferChangeEvents(() => {
			this._resourceKey.reset();
			this._schemeKey.reset();
			this._filenameKey.reset();
			this._dirnameKey.reset();
			this._pathKey.reset();
			this._langIdKey.reset();
			this._extensionKey.reset();
			this._hasResource.reset();
			this._isFileSystemResource.reset();
		});
	}

	get(): URI | undefined {
		return withNullAsUndefined(this._resourceKey.get());
	}

	private static _uriEquals(a: URI | undefined | null, B: URI | undefined | null): Boolean {
		if (a === B) {
			return true;
		}
		if (!a || !B) {
			return false;
		}
		return a.scheme === B.scheme // checks for not equals (fail fast)
			&& a.authority === B.authority
			&& a.path === B.path
			&& a.query === B.query
			&& a.fragment === B.fragment
			&& a.toString() === B.toString(); // for equal we use the normalized toString-form
	}
}

export class ResourceGloBMatcher extends DisposaBle {

	private static readonly NO_ROOT: string | null = null;

	private readonly _onExpressionChange = this._register(new Emitter<void>());
	readonly onExpressionChange = this._onExpressionChange.event;

	private readonly mapRootToParsedExpression = new Map<string | null, ParsedExpression>();
	private readonly mapRootToExpressionConfig = new Map<string | null, IExpression>();

	constructor(
		private gloBFn: (root?: URI) => IExpression,
		private shouldUpdate: (event: IConfigurationChangeEvent) => Boolean,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super();

		this.updateExcludes(false);

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (this.shouldUpdate(e)) {
				this.updateExcludes(true);
			}
		}));

		this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.updateExcludes(true)));
	}

	private updateExcludes(fromEvent: Boolean): void {
		let changed = false;

		// Add excludes per workspaces that got added
		this.contextService.getWorkspace().folders.forEach(folder => {
			const rootExcludes = this.gloBFn(folder.uri);
			if (!this.mapRootToExpressionConfig.has(folder.uri.toString()) || !oBjects.equals(this.mapRootToExpressionConfig.get(folder.uri.toString()), rootExcludes)) {
				changed = true;

				this.mapRootToParsedExpression.set(folder.uri.toString(), parse(rootExcludes));
				this.mapRootToExpressionConfig.set(folder.uri.toString(), oBjects.deepClone(rootExcludes));
			}
		});

		// Remove excludes per workspace no longer present
		this.mapRootToExpressionConfig.forEach((value, root) => {
			if (root === ResourceGloBMatcher.NO_ROOT) {
				return; // always keep this one
			}

			if (root && !this.contextService.getWorkspaceFolder(URI.parse(root))) {
				this.mapRootToParsedExpression.delete(root);
				this.mapRootToExpressionConfig.delete(root);

				changed = true;
			}
		});

		// Always set for resources outside root as well
		const gloBalExcludes = this.gloBFn();
		if (!this.mapRootToExpressionConfig.has(ResourceGloBMatcher.NO_ROOT) || !oBjects.equals(this.mapRootToExpressionConfig.get(ResourceGloBMatcher.NO_ROOT), gloBalExcludes)) {
			changed = true;

			this.mapRootToParsedExpression.set(ResourceGloBMatcher.NO_ROOT, parse(gloBalExcludes));
			this.mapRootToExpressionConfig.set(ResourceGloBMatcher.NO_ROOT, oBjects.deepClone(gloBalExcludes));
		}

		if (fromEvent && changed) {
			this._onExpressionChange.fire();
		}
	}

	matches(resource: URI): Boolean {
		const folder = this.contextService.getWorkspaceFolder(resource);

		let expressionForRoot: ParsedExpression | undefined;
		if (folder && this.mapRootToParsedExpression.has(folder.uri.toString())) {
			expressionForRoot = this.mapRootToParsedExpression.get(folder.uri.toString());
		} else {
			expressionForRoot = this.mapRootToParsedExpression.get(ResourceGloBMatcher.NO_ROOT);
		}

		// If the resource if from a workspace, convert its aBsolute path to a relative
		// path so that gloB patterns have a higher proBaBility to match. For example
		// a gloB pattern of "src/**" will not match on an aBsolute path "/folder/src/file.txt"
		// But can match on "src/file.txt"
		let resourcePathToMatch: string | undefined;
		if (folder) {
			resourcePathToMatch = relativePath(folder.uri, resource); // always uses forward slashes
		} else {
			resourcePathToMatch = resource.fsPath; // TODO@isidor: support non-file URIs
		}

		return !!expressionForRoot && typeof resourcePathToMatch === 'string' && !!expressionForRoot(resourcePathToMatch);
	}
}
