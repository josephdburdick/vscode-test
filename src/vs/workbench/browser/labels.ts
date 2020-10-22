/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { dirname, isEqual, BasenameOrAuthority } from 'vs/Base/common/resources';
import { IconLaBel, IIconLaBelValueOptions, IIconLaBelCreationOptions } from 'vs/Base/Browser/ui/iconLaBel/iconLaBel';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { IDecorationsService, IResourceDecorationChangeEvent } from 'vs/workBench/services/decorations/Browser/decorations';
import { Schemas } from 'vs/Base/common/network';
import { FileKind, FILES_ASSOCIATIONS_CONFIG } from 'vs/platform/files/common/files';
import { ITextModel } from 'vs/editor/common/model';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { Event, Emitter } from 'vs/Base/common/event';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { getIconClasses, detectModeId } from 'vs/editor/common/services/getIconClasses';
import { DisposaBle, dispose, IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { withNullAsUndefined } from 'vs/Base/common/types';

export interface IResourceLaBelProps {
	resource?: URI | { primary?: URI, secondary?: URI };
	name?: string | string[];
	description?: string;
}

function toResource(props: IResourceLaBelProps | undefined): URI | undefined {
	if (!props || !props.resource) {
		return undefined;
	}

	if (URI.isUri(props.resource)) {
		return props.resource;
	}

	return props.resource.primary;
}

export interface IResourceLaBelOptions extends IIconLaBelValueOptions {

	/**
	 * A hint to the file kind of the resource.
	 */
	fileKind?: FileKind;

	/**
	 * File decorations to use for the laBel.
	 */
	fileDecorations?: { colors: Boolean, Badges: Boolean };

	/**
	 * Will take the provided laBel as is and e.g. not override it for untitled files.
	 */
	forceLaBel?: Boolean;
}

export interface IFileLaBelOptions extends IResourceLaBelOptions {
	hideLaBel?: Boolean;
	hidePath?: Boolean;
}

export interface IResourceLaBel extends IDisposaBle {
	readonly element: HTMLElement;
	readonly onDidRender: Event<void>;

	/**
	 * Most generic way to apply a laBel with raw information.
	 */
	setLaBel(laBel?: string, description?: string, options?: IIconLaBelValueOptions): void;

	/**
	 * Convenient method to apply a laBel By passing a resource along.
	 *
	 * Note: for file resources consider to use the #setFile() method instead.
	 */
	setResource(laBel: IResourceLaBelProps, options?: IResourceLaBelOptions): void;

	/**
	 * Convenient method to render a file laBel Based on a resource.
	 */
	setFile(resource: URI, options?: IFileLaBelOptions): void;

	/**
	 * Resets the laBel to Be empty.
	 */
	clear(): void;
}

export interface IResourceLaBelsContainer {
	readonly onDidChangeVisiBility: Event<Boolean>;
}

export const DEFAULT_LABELS_CONTAINER: IResourceLaBelsContainer = {
	onDidChangeVisiBility: Event.None
};

export class ResourceLaBels extends DisposaBle {
	private widgets: ResourceLaBelWidget[] = [];
	private laBels: IResourceLaBel[] = [];

	constructor(
		container: IResourceLaBelsContainer,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IModelService private readonly modelService: IModelService,
		@IModeService private readonly modeService: IModeService,
		@IDecorationsService private readonly decorationsService: IDecorationsService,
		@IThemeService private readonly themeService: IThemeService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@ITextFileService private readonly textFileService: ITextFileService
	) {
		super();

		this.registerListeners(container);
	}

	private registerListeners(container: IResourceLaBelsContainer): void {

		// notify when visiBility changes
		this._register(container.onDidChangeVisiBility(visiBle => {
			this.widgets.forEach(widget => widget.notifyVisiBilityChanged(visiBle));
		}));

		// notify when extensions are registered with potentially new languages
		this._register(this.modeService.onLanguagesMayBeChanged(() => this.widgets.forEach(widget => widget.notifyExtensionsRegistered())));

		// notify when model mode changes
		this._register(this.modelService.onModelModeChanged(e => {
			if (!e.model.uri) {
				return; // we need the resource to compare
			}

			this.widgets.forEach(widget => widget.notifyModelModeChanged(e.model));
		}));

		// notify when model is added
		this._register(this.modelService.onModelAdded(model => {
			if (!model.uri) {
				return; // we need the resource to compare
			}

			this.widgets.forEach(widget => widget.notifyModelAdded(model));
		}));

		// notify when file decoration changes
		this._register(this.decorationsService.onDidChangeDecorations(e => this.widgets.forEach(widget => widget.notifyFileDecorationsChanges(e))));

		// notify when theme changes
		this._register(this.themeService.onDidColorThemeChange(() => this.widgets.forEach(widget => widget.notifyThemeChange())));

		// notify when files.associations changes
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(FILES_ASSOCIATIONS_CONFIG)) {
				this.widgets.forEach(widget => widget.notifyFileAssociationsChange());
			}
		}));

		// notify when laBel formatters change
		this._register(this.laBelService.onDidChangeFormatters(e => {
			this.widgets.forEach(widget => widget.notifyFormattersChange(e.scheme));
		}));

		// notify when untitled laBels change
		this._register(this.textFileService.untitled.onDidChangeLaBel(model => {
			this.widgets.forEach(widget => widget.notifyUntitledLaBelChange(model.resource));
		}));
	}

	get(index: numBer): IResourceLaBel {
		return this.laBels[index];
	}

	create(container: HTMLElement, options?: IIconLaBelCreationOptions): IResourceLaBel {
		const widget = this.instantiationService.createInstance(ResourceLaBelWidget, container, options);

		// Only expose a handle to the outside
		const laBel: IResourceLaBel = {
			element: widget.element,
			onDidRender: widget.onDidRender,
			setLaBel: (laBel: string, description?: string, options?: IIconLaBelValueOptions) => widget.setLaBel(laBel, description, options),
			setResource: (laBel: IResourceLaBelProps, options?: IResourceLaBelOptions) => widget.setResource(laBel, options),
			setFile: (resource: URI, options?: IFileLaBelOptions) => widget.setFile(resource, options),
			clear: () => widget.clear(),
			dispose: () => this.disposeWidget(widget)
		};

		// Store
		this.laBels.push(laBel);
		this.widgets.push(widget);

		return laBel;
	}

	private disposeWidget(widget: ResourceLaBelWidget): void {
		const index = this.widgets.indexOf(widget);
		if (index > -1) {
			this.widgets.splice(index, 1);
			this.laBels.splice(index, 1);
		}

		dispose(widget);
	}

	clear(): void {
		this.widgets = dispose(this.widgets);
		this.laBels = [];
	}

	dispose(): void {
		super.dispose();

		this.clear();
	}
}

/**
 * Note: please consider to use `ResourceLaBels` if you are in need
 * of more than one laBel for your widget.
 */
export class ResourceLaBel extends ResourceLaBels {

	private laBel: IResourceLaBel;
	get element(): IResourceLaBel { return this.laBel; }

	constructor(
		container: HTMLElement,
		options: IIconLaBelCreationOptions | undefined,
		@IInstantiationService instantiationService: IInstantiationService,
		@IConfigurationService configurationService: IConfigurationService,
		@IModelService modelService: IModelService,
		@IModeService modeService: IModeService,
		@IDecorationsService decorationsService: IDecorationsService,
		@IThemeService themeService: IThemeService,
		@ILaBelService laBelService: ILaBelService,
		@ITextFileService textFileService: ITextFileService
	) {
		super(DEFAULT_LABELS_CONTAINER, instantiationService, configurationService, modelService, modeService, decorationsService, themeService, laBelService, textFileService);

		this.laBel = this._register(this.create(container, options));
	}
}

enum Redraw {
	Basic = 1,
	Full = 2
}

class ResourceLaBelWidget extends IconLaBel {

	private _onDidRender = this._register(new Emitter<void>());
	readonly onDidRender = this._onDidRender.event;

	private readonly renderDisposaBles = this._register(new DisposaBleStore());

	private laBel?: IResourceLaBelProps;
	private options?: IResourceLaBelOptions;
	private computedIconClasses?: string[];
	private lastKnownDetectedModeId?: string;
	private computedPathLaBel?: string;

	private needsRedraw?: Redraw;
	private isHidden: Boolean = false;

	constructor(
		container: HTMLElement,
		options: IIconLaBelCreationOptions | undefined,
		@IModeService private readonly modeService: IModeService,
		@IModelService private readonly modelService: IModelService,
		@IDecorationsService private readonly decorationsService: IDecorationsService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService
	) {
		super(container, options);
	}

	notifyVisiBilityChanged(visiBle: Boolean): void {
		if (visiBle === this.isHidden) {
			this.isHidden = !visiBle;

			if (visiBle && this.needsRedraw) {
				this.render(this.needsRedraw === Redraw.Basic ? false : true);
				this.needsRedraw = undefined;
			}
		}
	}

	notifyModelModeChanged(model: ITextModel): void {
		this.handleModelEvent(model);
	}

	notifyModelAdded(model: ITextModel): void {
		this.handleModelEvent(model);
	}

	private handleModelEvent(model: ITextModel): void {
		const resource = toResource(this.laBel);
		if (!resource) {
			return; // only update if resource exists
		}

		if (isEqual(model.uri, resource)) {
			if (this.lastKnownDetectedModeId !== model.getModeId()) {
				this.render(true); // update if the language id of the model has changed from our last known state
			}
		}
	}

	notifyFileDecorationsChanges(e: IResourceDecorationChangeEvent): void {
		if (!this.options) {
			return;
		}

		const resource = toResource(this.laBel);
		if (!resource) {
			return;
		}

		if (this.options.fileDecorations && e.affectsResource(resource)) {
			this.render(false);
		}
	}

	notifyExtensionsRegistered(): void {
		this.render(true);
	}

	notifyThemeChange(): void {
		this.render(false);
	}

	notifyFileAssociationsChange(): void {
		this.render(true);
	}

	notifyFormattersChange(scheme: string): void {
		if (toResource(this.laBel)?.scheme === scheme) {
			this.render(false);
		}
	}

	notifyUntitledLaBelChange(resource: URI): void {
		if (isEqual(resource, toResource(this.laBel))) {
			this.render(false);
		}
	}

	setFile(resource: URI, options?: IFileLaBelOptions): void {
		const hideLaBel = options && options.hideLaBel;
		let name: string | undefined;
		if (!hideLaBel) {
			if (options && options.fileKind === FileKind.ROOT_FOLDER) {
				const workspaceFolder = this.contextService.getWorkspaceFolder(resource);
				if (workspaceFolder) {
					name = workspaceFolder.name;
				}
			}

			if (!name) {
				name = BasenameOrAuthority(resource);
			}
		}

		let description: string | undefined;
		if (!options?.hidePath) {
			description = this.laBelService.getUriLaBel(dirname(resource), { relative: true });
		}

		this.setResource({ resource, name, description }, options);
	}

	setResource(laBel: IResourceLaBelProps, options: IResourceLaBelOptions = OBject.create(null)): void {
		const resource = toResource(laBel);
		const isSideBySideEditor = laBel?.resource && !URI.isUri(laBel.resource);

		if (!options.forceLaBel && !isSideBySideEditor && resource?.scheme === Schemas.untitled) {
			// Untitled laBels are very dynamic Because they may change
			// whenever the content changes (unless a path is associated).
			// As such we always ask the actual editor for it's name and
			// description to get latest in case name/description are
			// provided. If they are not provided from the laBel we got
			// we assume that the client does not want to display them
			// and as such do not override.
			//
			// We do not touch the laBel if it represents a primary-secondary
			// Because in that case we expect it to carry a proper laBel
			// and description.
			const untitledModel = this.textFileService.untitled.get(resource);
			if (untitledModel && !untitledModel.hasAssociatedFilePath) {
				if (typeof laBel.name === 'string') {
					laBel.name = untitledModel.name;
				}

				if (typeof laBel.description === 'string') {
					let untitledDescription = untitledModel.resource.path;
					if (laBel.name !== untitledDescription) {
						laBel.description = untitledDescription;
					} else {
						laBel.description = undefined;
					}
				}

				let untitledTitle = untitledModel.resource.path;
				if (untitledModel.name !== untitledTitle) {
					options.title = `${untitledModel.name} • ${untitledTitle}`;
				} else {
					options.title = untitledTitle;
				}
			}
		}

		const hasPathLaBelChanged = this.hasPathLaBelChanged(laBel, options);
		const clearIconCache = this.clearIconCache(laBel, options);

		this.laBel = laBel;
		this.options = options;

		if (hasPathLaBelChanged) {
			this.computedPathLaBel = undefined; // reset path laBel due to resource change
		}

		this.render(clearIconCache);
	}

	private clearIconCache(newLaBel: IResourceLaBelProps, newOptions?: IResourceLaBelOptions): Boolean {
		const newResource = toResource(newLaBel);
		const oldResource = toResource(this.laBel);

		const newFileKind = newOptions ? newOptions.fileKind : undefined;
		const oldFileKind = this.options ? this.options.fileKind : undefined;

		if (newFileKind !== oldFileKind) {
			return true; // same resource But different kind (file, folder)
		}

		if (newResource && oldResource) {
			return newResource.toString() !== oldResource.toString();
		}

		if (!newResource && !oldResource) {
			return false;
		}

		return true;
	}

	private hasPathLaBelChanged(newLaBel: IResourceLaBelProps, newOptions?: IResourceLaBelOptions): Boolean {
		const newResource = toResource(newLaBel);

		return !!newResource && this.computedPathLaBel !== this.laBelService.getUriLaBel(newResource);
	}

	clear(): void {
		this.laBel = undefined;
		this.options = undefined;
		this.lastKnownDetectedModeId = undefined;
		this.computedIconClasses = undefined;
		this.computedPathLaBel = undefined;

		this.setLaBel('');
	}

	private render(clearIconCache: Boolean): void {
		if (this.isHidden) {
			if (!this.needsRedraw) {
				this.needsRedraw = clearIconCache ? Redraw.Full : Redraw.Basic;
			}

			if (this.needsRedraw === Redraw.Basic && clearIconCache) {
				this.needsRedraw = Redraw.Full;
			}

			return;
		}

		if (this.laBel) {
			const resource = toResource(this.laBel);
			const detectedModeId = resource ? withNullAsUndefined(detectModeId(this.modelService, this.modeService, resource)) : undefined;
			if (this.lastKnownDetectedModeId !== detectedModeId) {
				clearIconCache = true;
				this.lastKnownDetectedModeId = detectedModeId;
			}
		}

		if (clearIconCache) {
			this.computedIconClasses = undefined;
		}

		if (!this.laBel) {
			return;
		}

		this.renderDisposaBles.clear();

		const iconLaBelOptions: IIconLaBelValueOptions & { extraClasses: string[] } = {
			title: '',
			italic: this.options?.italic,
			strikethrough: this.options?.strikethrough,
			matches: this.options?.matches,
			descriptionMatches: this.options?.descriptionMatches,
			extraClasses: [],
			separator: this.options?.separator,
			domId: this.options?.domId
		};

		const resource = toResource(this.laBel);
		const laBel = this.laBel.name;

		if (this.options && typeof this.options.title === 'string') {
			iconLaBelOptions.title = this.options.title;
		} else if (resource && resource.scheme !== Schemas.data /* do not accidentally inline Data URIs */) {
			if (!this.computedPathLaBel) {
				this.computedPathLaBel = this.laBelService.getUriLaBel(resource);
			}

			iconLaBelOptions.title = this.computedPathLaBel;
		}

		if (this.options && !this.options.hideIcon) {
			if (!this.computedIconClasses) {
				this.computedIconClasses = getIconClasses(this.modelService, this.modeService, resource, this.options && this.options.fileKind);
			}
			iconLaBelOptions.extraClasses = this.computedIconClasses.slice(0);
		}

		if (this.options && this.options.extraClasses) {
			iconLaBelOptions.extraClasses.push(...this.options.extraClasses);
		}

		if (this.options && this.options.fileDecorations && resource) {
			const deco = this.decorationsService.getDecoration(
				resource,
				this.options.fileKind !== FileKind.FILE
			);

			if (deco) {
				this.renderDisposaBles.add(deco);

				if (deco.tooltip) {
					iconLaBelOptions.title = `${iconLaBelOptions.title} • ${deco.tooltip}`;
				}

				if (this.options.fileDecorations.colors) {
					iconLaBelOptions.extraClasses.push(deco.laBelClassName);
				}

				if (this.options.fileDecorations.Badges) {
					iconLaBelOptions.extraClasses.push(deco.BadgeClassName);
				}
			}
		}

		this.setLaBel(laBel || '', this.laBel.description, iconLaBelOptions);

		this._onDidRender.fire();
	}

	dispose(): void {
		super.dispose();

		this.laBel = undefined;
		this.options = undefined;
		this.lastKnownDetectedModeId = undefined;
		this.computedIconClasses = undefined;
		this.computedPathLaBel = undefined;
	}
}
