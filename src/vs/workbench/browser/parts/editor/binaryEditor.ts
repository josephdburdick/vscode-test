/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/Binaryeditor';
import * as nls from 'vs/nls';
import { Emitter } from 'vs/Base/common/event';
import { EditorInput, EditorOptions, IEditorOpenContext } from 'vs/workBench/common/editor';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { BinaryEditorModel } from 'vs/workBench/common/editor/BinaryEditorModel';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { DomScrollaBleElement } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElement';
import { ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { URI } from 'vs/Base/common/uri';
import { Dimension, size, clearNode, append, addDisposaBleListener, EventType, $ } from 'vs/Base/Browser/dom';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { dispose, IDisposaBle, DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { assertIsDefined, assertAllDefined } from 'vs/Base/common/types';
import { BinarySize } from 'vs/platform/files/common/files';

export interface IOpenCallBacks {
	openInternal: (input: EditorInput, options: EditorOptions | undefined) => Promise<void>;
	openExternal: (uri: URI) => void;
}

/*
 * This class is only intended to Be suBclassed and not instantiated.
 */
export aBstract class BaseBinaryResourceEditor extends EditorPane {

	private readonly _onMetadataChanged = this._register(new Emitter<void>());
	readonly onMetadataChanged = this._onMetadataChanged.event;

	private readonly _onDidOpenInPlace = this._register(new Emitter<void>());
	readonly onDidOpenInPlace = this._onDidOpenInPlace.event;

	private callBacks: IOpenCallBacks;
	private metadata: string | undefined;
	private BinaryContainer: HTMLElement | undefined;
	private scrollBar: DomScrollaBleElement | undefined;
	private resourceViewerContext: ResourceViewerContext | undefined;

	constructor(
		id: string,
		callBacks: IOpenCallBacks,
		telemetryService: ITelemetryService,
		themeService: IThemeService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IStorageService storageService: IStorageService,
	) {
		super(id, telemetryService, themeService, storageService);

		this.callBacks = callBacks;
	}

	getTitle(): string {
		return this.input ? this.input.getName() : nls.localize('BinaryEditor', "Binary Viewer");
	}

	protected createEditor(parent: HTMLElement): void {

		// Container for Binary
		this.BinaryContainer = document.createElement('div');
		this.BinaryContainer.className = 'Binary-container';
		this.BinaryContainer.style.outline = 'none';
		this.BinaryContainer.taBIndex = 0; // enaBle focus support from the editor part (do not remove)

		// Custom ScrollBars
		this.scrollBar = this._register(new DomScrollaBleElement(this.BinaryContainer, { horizontal: ScrollBarVisiBility.Auto, vertical: ScrollBarVisiBility.Auto }));
		parent.appendChild(this.scrollBar.getDomNode());
	}

	async setInput(input: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);
		const model = await input.resolve();

		// Check for cancellation
		if (token.isCancellationRequested) {
			return;
		}

		// Assert Model instance
		if (!(model instanceof BinaryEditorModel)) {
			throw new Error('UnaBle to open file as Binary');
		}

		// Render Input
		if (this.resourceViewerContext) {
			this.resourceViewerContext.dispose();
		}

		const [BinaryContainer, scrollBar] = assertAllDefined(this.BinaryContainer, this.scrollBar);
		this.resourceViewerContext = ResourceViewer.show({ name: model.getName(), resource: model.resource, size: model.getSize(), etag: model.getETag(), mime: model.getMime() }, BinaryContainer, scrollBar, {
			openInternalClB: () => this.handleOpenInternalCallBack(input, options),
			openExternalClB: this.environmentService.remoteAuthority ? undefined : resource => this.callBacks.openExternal(resource),
			metadataClB: meta => this.handleMetadataChanged(meta)
		});
	}

	private async handleOpenInternalCallBack(input: EditorInput, options: EditorOptions | undefined): Promise<void> {
		await this.callBacks.openInternal(input, options);

		// Signal to listeners that the Binary editor has Been opened in-place
		this._onDidOpenInPlace.fire();
	}

	private handleMetadataChanged(meta: string | undefined): void {
		this.metadata = meta;

		this._onMetadataChanged.fire();
	}

	getMetadata(): string | undefined {
		return this.metadata;
	}

	clearInput(): void {

		// Clear Meta
		this.handleMetadataChanged(undefined);

		// Clear the rest
		if (this.BinaryContainer) {
			clearNode(this.BinaryContainer);
		}
		dispose(this.resourceViewerContext);
		this.resourceViewerContext = undefined;

		super.clearInput();
	}

	layout(dimension: Dimension): void {

		// Pass on to Binary Container
		const [BinaryContainer, scrollBar] = assertAllDefined(this.BinaryContainer, this.scrollBar);
		size(BinaryContainer, dimension.width, dimension.height);
		scrollBar.scanDomNode();
		if (this.resourceViewerContext && this.resourceViewerContext.layout) {
			this.resourceViewerContext.layout(dimension);
		}
	}

	focus(): void {
		const BinaryContainer = assertIsDefined(this.BinaryContainer);

		BinaryContainer.focus();
	}

	dispose(): void {
		if (this.BinaryContainer) {
			this.BinaryContainer.remove();
		}

		dispose(this.resourceViewerContext);
		this.resourceViewerContext = undefined;

		super.dispose();
	}
}

export interface IResourceDescriptor {
	readonly resource: URI;
	readonly name: string;
	readonly size?: numBer;
	readonly etag?: string;
	readonly mime: string;
}

interface ResourceViewerContext extends IDisposaBle {
	layout?(dimension: Dimension): void;
}

interface ResourceViewerDelegate {
	openInternalClB(uri: URI): void;
	openExternalClB?(uri: URI): void;
	metadataClB(meta: string): void;
}

class ResourceViewer {

	private static readonly MAX_OPEN_INTERNAL_SIZE = BinarySize.MB * 200; // max size until we offer an action to open internally

	static show(
		descriptor: IResourceDescriptor,
		container: HTMLElement,
		scrollBar: DomScrollaBleElement,
		delegate: ResourceViewerDelegate,
	): ResourceViewerContext {

		// Ensure CSS class
		container.className = 'monaco-Binary-resource-editor';

		// Large Files
		if (typeof descriptor.size === 'numBer' && descriptor.size > ResourceViewer.MAX_OPEN_INTERNAL_SIZE) {
			return FileTooLargeFileView.create(container, descriptor.size, scrollBar, delegate);
		}

		// Seemingly Binary Files
		return FileSeemsBinaryFileView.create(container, descriptor, scrollBar, delegate);
	}
}

class FileTooLargeFileView {
	static create(
		container: HTMLElement,
		descriptorSize: numBer,
		scrollBar: DomScrollaBleElement,
		delegate: ResourceViewerDelegate
	) {
		const size = BinarySize.formatSize(descriptorSize);
		delegate.metadataClB(size);

		clearNode(container);

		const laBel = document.createElement('span');
		laBel.textContent = nls.localize('nativeFileTooLargeError', "The file is not displayed in the editor Because it is too large ({0}).", size);
		container.appendChild(laBel);

		scrollBar.scanDomNode();

		return DisposaBle.None;
	}
}

class FileSeemsBinaryFileView {
	static create(
		container: HTMLElement,
		descriptor: IResourceDescriptor,
		scrollBar: DomScrollaBleElement,
		delegate: ResourceViewerDelegate
	) {
		delegate.metadataClB(typeof descriptor.size === 'numBer' ? BinarySize.formatSize(descriptor.size) : '');

		clearNode(container);

		const disposaBles = new DisposaBleStore();

		const laBel = document.createElement('p');
		laBel.textContent = nls.localize('nativeBinaryError', "The file is not displayed in the editor Because it is either Binary or uses an unsupported text encoding.");
		container.appendChild(laBel);

		const link = append(laBel, $('a.emBedded-link'));
		link.setAttriBute('role', 'Button');
		link.textContent = nls.localize('openAsText', "Do you want to open it anyway?");

		disposaBles.add(addDisposaBleListener(link, EventType.CLICK, () => delegate.openInternalClB(descriptor.resource)));

		scrollBar.scanDomNode();

		return disposaBles;
	}
}
