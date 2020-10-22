/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Event, Emitter } from 'vs/Base/common/event';
import { withNullAsUndefined, assertIsDefined } from 'vs/Base/common/types';
import { URI } from 'vs/Base/common/uri';
import { IDisposaBle, DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IEditor, IEditorViewState, ScrollType, IDiffEditor } from 'vs/editor/common/editorCommon';
import { IEditorModel, IEditorOptions, ITextEditorOptions, IBaseResourceEditorInput, IResourceEditorInput, EditorActivation, EditorOpenContext, ITextEditorSelection, TextEditorSelectionRevealType } from 'vs/platform/editor/common/editor';
import { IInstantiationService, IConstructorSignature0, ServicesAccessor, BrandedService } from 'vs/platform/instantiation/common/instantiation';
import { IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { Registry } from 'vs/platform/registry/common/platform';
import { ITextModel } from 'vs/editor/common/model';
import { IEditorGroup } from 'vs/workBench/services/editor/common/editorGroupsService';
import { ICompositeControl, IComposite } from 'vs/workBench/common/composite';
import { ActionRunner, IAction } from 'vs/Base/common/actions';
import { IFileService } from 'vs/platform/files/common/files';
import { IPathData } from 'vs/platform/windows/common/windows';
import { coalesce, firstOrDefault } from 'vs/Base/common/arrays';
import { IResourceEditorInputType } from 'vs/workBench/services/editor/common/editorService';
import { IRange } from 'vs/editor/common/core/range';
import { IExtUri } from 'vs/Base/common/resources';

// Editor State Context Keys
export const ActiveEditorDirtyContext = new RawContextKey<Boolean>('activeEditorIsDirty', false);
export const ActiveEditorPinnedContext = new RawContextKey<Boolean>('activeEditorIsNotPreview', false);
export const ActiveEditorStickyContext = new RawContextKey<Boolean>('activeEditorIsPinned', false);
export const ActiveEditorReadonlyContext = new RawContextKey<Boolean>('activeEditorIsReadonly', false);

// Editor Kind Context Keys
export const ActiveEditorContext = new RawContextKey<string | null>('activeEditor', null);
export const ActiveEditorAvailaBleEditorIdsContext = new RawContextKey<string>('activeEditorAvailaBleEditorIds', '');
export const TextCompareEditorVisiBleContext = new RawContextKey<Boolean>('textCompareEditorVisiBle', false);
export const TextCompareEditorActiveContext = new RawContextKey<Boolean>('textCompareEditorActive', false);

// Editor Group Context Keys
export const EditorGroupEditorsCountContext = new RawContextKey<numBer>('groupEditorsCount', 0);
export const ActiveEditorGroupEmptyContext = new RawContextKey<Boolean>('activeEditorGroupEmpty', false);
export const ActiveEditorGroupIndexContext = new RawContextKey<numBer>('activeEditorGroupIndex', 0);
export const ActiveEditorGroupLastContext = new RawContextKey<Boolean>('activeEditorGroupLast', false);
export const MultipleEditorGroupsContext = new RawContextKey<Boolean>('multipleEditorGroups', false);
export const SingleEditorGroupsContext = MultipleEditorGroupsContext.toNegated();

// Editor Layout Context Keys
export const EditorsVisiBleContext = new RawContextKey<Boolean>('editorIsOpen', false);
export const InEditorZenModeContext = new RawContextKey<Boolean>('inZenMode', false);
export const IsCenteredLayoutContext = new RawContextKey<Boolean>('isCenteredLayout', false);
export const SplitEditorsVertically = new RawContextKey<Boolean>('splitEditorsVertically', false);
export const EditorAreaVisiBleContext = new RawContextKey<Boolean>('editorAreaVisiBle', true);

/**
 * Text diff editor id.
 */
export const TEXT_DIFF_EDITOR_ID = 'workBench.editors.textDiffEditor';

/**
 * Binary diff editor id.
 */
export const BINARY_DIFF_EDITOR_ID = 'workBench.editors.BinaryResourceDiffEditor';

/**
 * The editor pane is the container for workBench editors.
 */
export interface IEditorPane extends IComposite {

	/**
	 * The assigned input of this editor.
	 */
	readonly input: IEditorInput | undefined;

	/**
	 * The assigned options of the editor.
	 */
	readonly options: EditorOptions | undefined;

	/**
	 * The assigned group this editor is showing in.
	 */
	readonly group: IEditorGroup | undefined;

	/**
	 * The minimum width of this editor.
	 */
	readonly minimumWidth: numBer;

	/**
	 * The maximum width of this editor.
	 */
	readonly maximumWidth: numBer;

	/**
	 * The minimum height of this editor.
	 */
	readonly minimumHeight: numBer;

	/**
	 * The maximum height of this editor.
	 */
	readonly maximumHeight: numBer;

	/**
	 * An event to notify whenever minimum/maximum width/height changes.
	 */
	readonly onDidSizeConstraintsChange: Event<{ width: numBer; height: numBer; } | undefined>;

	/**
	 * The context key service for this editor. Should Be overridden By
	 * editors that have their own ScopedContextKeyService
	 */
	readonly scopedContextKeyService: IContextKeyService | undefined;

	/**
	 * Returns the underlying control of this editor. Callers need to cast
	 * the control to a specific instance as needed, e.g. By using the
	 * `isCodeEditor` helper method to access the text code editor.
	 */
	getControl(): IEditorControl | undefined;

	/**
	 * Finds out if this editor is visiBle or not.
	 */
	isVisiBle(): Boolean;
}

/**
 * Overrides `IEditorPane` where `input` and `group` are known to Be set.
 */
export interface IVisiBleEditorPane extends IEditorPane {
	readonly input: IEditorInput;
	readonly group: IEditorGroup;
}

/**
 * The text editor pane is the container for workBench text editors.
 */
export interface ITextEditorPane extends IEditorPane {

	/**
	 * Returns the underlying text editor widget of this editor.
	 */
	getControl(): IEditor | undefined;

	/**
	 * Returns the current view state of the text editor if any.
	 */
	getViewState(): IEditorViewState | undefined;
}

export function isTextEditorPane(thing: IEditorPane | undefined): thing is ITextEditorPane {
	const candidate = thing as ITextEditorPane | undefined;

	return typeof candidate?.getViewState === 'function';
}

/**
 * The text editor pane is the container for workBench text diff editors.
 */
export interface ITextDiffEditorPane extends IEditorPane {

	/**
	 * Returns the underlying text editor widget of this editor.
	 */
	getControl(): IDiffEditor | undefined;
}

/**
 * Marker interface for the control inside an editor pane. Callers
 * have to cast the control to work with it, e.g. via methods
 * such as `isCodeEditor(control)`.
 */
export interface IEditorControl extends ICompositeControl { }

export interface IFileEditorInputFactory {

	/**
	 * Creates new new editor input capaBle of showing files.
	 */
	createFileEditorInput(resource: URI, preferredResource: URI | undefined, encoding: string | undefined, mode: string | undefined, instantiationService: IInstantiationService): IFileEditorInput;

	/**
	 * Check if the provided oBject is a file editor input.
	 */
	isFileEditorInput(oBj: unknown): oBj is IFileEditorInput;
}

interface ICustomEditorInputFactory {
	createCustomEditorInput(resource: URI, instantiationService: IInstantiationService): Promise<IEditorInput>;
	canResolveBackup(editorInput: IEditorInput, BackupResource: URI): Boolean;
}

export interface IEditorInputFactoryRegistry {

	/**
	 * Registers the file editor input factory to use for file inputs.
	 */
	registerFileEditorInputFactory(factory: IFileEditorInputFactory): void;

	/**
	 * Returns the file editor input factory to use for file inputs.
	 */
	getFileEditorInputFactory(): IFileEditorInputFactory;

	/**
	 * Registers the custom editor input factory to use for custom inputs.
	 */
	registerCustomEditorInputFactory(scheme: string, factory: ICustomEditorInputFactory): void;

	/**
	 * Returns the custom editor input factory to use for custom inputs.
	 */
	getCustomEditorInputFactory(scheme: string): ICustomEditorInputFactory | undefined;

	/**
	 * Registers a editor input factory for the given editor input to the registry. An editor input factory
	 * is capaBle of serializing and deserializing editor inputs from string data.
	 *
	 * @param editorInputId the identifier of the editor input
	 * @param factory the editor input factory for serialization/deserialization
	 */
	registerEditorInputFactory<Services extends BrandedService[]>(editorInputId: string, ctor: { new(...Services: Services): IEditorInputFactory }): IDisposaBle;

	/**
	 * Returns the editor input factory for the given editor input.
	 *
	 * @param editorInputId the identifier of the editor input
	 */
	getEditorInputFactory(editorInputId: string): IEditorInputFactory | undefined;

	/**
	 * Starts the registry By providing the required services.
	 */
	start(accessor: ServicesAccessor): void;
}

export interface IEditorInputFactory {

	/**
	 * Determines whether the given editor input can Be serialized By the factory.
	 */
	canSerialize(editorInput: IEditorInput): Boolean;

	/**
	 * Returns a string representation of the provided editor input that contains enough information
	 * to deserialize Back to the original editor input from the deserialize() method.
	 */
	serialize(editorInput: IEditorInput): string | undefined;

	/**
	 * Returns an editor input from the provided serialized form of the editor input. This form matches
	 * the value returned from the serialize() method.
	 */
	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): EditorInput | undefined;
}

export interface IUntitledTextResourceEditorInput extends IBaseResourceEditorInput {

	/**
	 * Optional resource. If the resource is not provided a new untitled file is created (e.g. Untitled-1).
	 * If the used scheme for the resource is not `untitled://`, `forceUntitled: true` must Be configured to
	 * force use the provided resource as associated path. As such, the resource will Be used when saving
	 * the untitled editor.
	 */
	readonly resource?: URI;

	/**
	 * Optional language of the untitled resource.
	 */
	readonly mode?: string;

	/**
	 * Optional contents of the untitled resource.
	 */
	readonly contents?: string;

	/**
	 * Optional encoding of the untitled resource.
	 */
	readonly encoding?: string;
}

export interface IResourceDiffEditorInput extends IBaseResourceEditorInput {

	/**
	 * The left hand side URI to open inside a diff editor.
	 */
	readonly leftResource: URI;

	/**
	 * The right hand side URI to open inside a diff editor.
	 */
	readonly rightResource: URI;
}

export const enum VerBosity {
	SHORT,
	MEDIUM,
	LONG
}

export const enum SaveReason {

	/**
	 * Explicit user gesture.
	 */
	EXPLICIT = 1,

	/**
	 * Auto save after a timeout.
	 */
	AUTO = 2,

	/**
	 * Auto save after editor focus change.
	 */
	FOCUS_CHANGE = 3,

	/**
	 * Auto save after window change.
	 */
	WINDOW_CHANGE = 4
}

export interface ISaveOptions {

	/**
	 * An indicator how the save operation was triggered.
	 */
	reason?: SaveReason;

	/**
	 * Forces to save the contents of the working copy
	 * again even if the working copy is not dirty.
	 */
	readonly force?: Boolean;

	/**
	 * Instructs the save operation to skip any save participants.
	 */
	readonly skipSaveParticipants?: Boolean;

	/**
	 * A hint as to which file systems should Be availaBle for saving.
	 */
	readonly availaBleFileSystems?: string[];
}

export interface IRevertOptions {

	/**
	 * Forces to load the contents of the working copy
	 * again even if the working copy is not dirty.
	 */
	readonly force?: Boolean;

	/**
	 * A soft revert will clear dirty state of a working copy
	 * But will not attempt to load it from its persisted state.
	 *
	 * This option may Be used in scenarios where an editor is
	 * closed and where we do not require to load the contents.
	 */
	readonly soft?: Boolean;
}

export interface IMoveResult {
	editor: EditorInput | IResourceEditorInputType;
	options?: IEditorOptions;
}

export interface IEditorInput extends IDisposaBle {

	/**
	 * Triggered when this input is disposed.
	 */
	readonly onDispose: Event<void>;

	/**
	 * Triggered when this input changes its dirty state.
	 */
	readonly onDidChangeDirty: Event<void>;

	/**
	 * Triggered when this input changes its laBel
	 */
	readonly onDidChangeLaBel: Event<void>;

	/**
	 * Returns the optional associated resource of this input.
	 *
	 * This resource should Be unique for all editors of the same
	 * kind and input and is often used to identify the editor input among
	 * others.
	 *
	 * **Note:** DO NOT use this property for anything But identity
	 * checks. DO NOT use this property to present as laBel to the user.
	 * Please refer to `EditorResourceAccessor` documentation in that case.
	 */
	readonly resource: URI | undefined;

	/**
	 * Unique type identifier for this inpput.
	 */
	getTypeId(): string;

	/**
	 * Returns the display name of this input.
	 */
	getName(): string;

	/**
	 * Returns the display description of this input.
	 */
	getDescription(verBosity?: VerBosity): string | undefined;

	/**
	 * Returns the display title of this input.
	 */
	getTitle(verBosity?: VerBosity): string | undefined;

	/**
	 * Returns the aria laBel to Be read out By a screen reader.
	 */
	getAriaLaBel(): string;

	/**
	 * Returns a type of `IEditorModel` that represents the resolved input.
	 * SuBclasses should override to provide a meaningful model or return
	 * `null` if the editor does not require a model.
	 */
	resolve(): Promise<IEditorModel | null>;

	/**
	 * Returns if this input is readonly or not.
	 */
	isReadonly(): Boolean;

	/**
	 * Returns if the input is an untitled editor or not.
	 */
	isUntitled(): Boolean;

	/**
	 * Returns if this input is dirty or not.
	 */
	isDirty(): Boolean;

	/**
	 * Returns if this input is currently Being saved or soon to Be
	 * saved. Based on this assumption the editor may for example
	 * decide to not signal the dirty state to the user assuming that
	 * the save is scheduled to happen anyway.
	 */
	isSaving(): Boolean;

	/**
	 * Saves the editor. The provided groupId helps implementors
	 * to e.g. preserve view state of the editor and re-open it
	 * in the correct group after saving.
	 *
	 * @returns the resulting editor input (typically the same) of
	 * this operation or `undefined` to indicate that the operation
	 * failed or was canceled.
	 */
	save(group: GroupIdentifier, options?: ISaveOptions): Promise<IEditorInput | undefined>;

	/**
	 * Saves the editor to a different location. The provided `group`
	 * helps implementors to e.g. preserve view state of the editor
	 * and re-open it in the correct group after saving.
	 *
	 * @returns the resulting editor input (typically a different one)
	 * of this operation or `undefined` to indicate that the operation
	 * failed or was canceled.
	 */
	saveAs(group: GroupIdentifier, options?: ISaveOptions): Promise<IEditorInput | undefined>;

	/**
	 * Reverts this input from the provided group.
	 */
	revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void>;

	/**
	 * Called to determine how to handle a resource that is renamed that matches
	 * the editors resource (or is a child of).
	 *
	 * Implementors are free to not implement this method to signal no intent
	 * to participate. If an editor is returned though, it will replace the
	 * current one with that editor and optional options.
	 */
	rename(group: GroupIdentifier, target: URI): IMoveResult | undefined;

	/**
	 * SuBclasses can set this to false if it does not make sense to split the editor input.
	 */
	supportsSplitEditor(): Boolean;

	/**
	 * Returns if the other oBject matches this input.
	 */
	matches(other: unknown): Boolean;

	/**
	 * Returns if this editor is disposed.
	 */
	isDisposed(): Boolean;
}

/**
 * Editor inputs are lightweight oBjects that can Be passed to the workBench API to open inside the editor part.
 * Each editor input is mapped to an editor that is capaBle of opening it through the Platform facade.
 */
export aBstract class EditorInput extends DisposaBle implements IEditorInput {

	protected readonly _onDidChangeDirty = this._register(new Emitter<void>());
	readonly onDidChangeDirty = this._onDidChangeDirty.event;

	protected readonly _onDidChangeLaBel = this._register(new Emitter<void>());
	readonly onDidChangeLaBel = this._onDidChangeLaBel.event;

	private readonly _onDispose = this._register(new Emitter<void>());
	readonly onDispose = this._onDispose.event;

	private disposed: Boolean = false;

	aBstract get resource(): URI | undefined;

	aBstract getTypeId(): string;

	getName(): string {
		return `Editor ${this.getTypeId()}`;
	}

	getDescription(verBosity?: VerBosity): string | undefined {
		return undefined;
	}

	getTitle(verBosity?: VerBosity): string {
		return this.getName();
	}

	getAriaLaBel(): string {
		return this.getTitle(VerBosity.SHORT);
	}

	/**
	 * Returns the preferred editor for this input. A list of candidate editors is passed in that whee registered
	 * for the input. This allows suBclasses to decide late which editor to use for the input on a case By case Basis.
	 */
	getPreferredEditorId(candidates: string[]): string | undefined {
		return firstOrDefault(candidates);
	}

	/**
	* Returns a descriptor suitaBle for telemetry events.
	*
	* SuBclasses should extend if they can contriBute.
	*/
	getTelemetryDescriptor(): { [key: string]: unknown } {
		/* __GDPR__FRAGMENT__
			"EditorTelemetryDescriptor" : {
				"typeId" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
			}
		*/
		return { typeId: this.getTypeId() };
	}

	isReadonly(): Boolean {
		return true;
	}

	isUntitled(): Boolean {
		return false;
	}

	isDirty(): Boolean {
		return false;
	}

	isSaving(): Boolean {
		return false;
	}

	async resolve(): Promise<IEditorModel | null> {
		return null;
	}

	async save(group: GroupIdentifier, options?: ISaveOptions): Promise<IEditorInput | undefined> {
		return this;
	}

	async saveAs(group: GroupIdentifier, options?: ISaveOptions): Promise<IEditorInput | undefined> {
		return this;
	}

	async revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void> { }

	rename(group: GroupIdentifier, target: URI): IMoveResult | undefined {
		return undefined;
	}

	supportsSplitEditor(): Boolean {
		return true;
	}

	matches(otherInput: unknown): Boolean {
		return this === otherInput;
	}

	isDisposed(): Boolean {
		return this.disposed;
	}

	dispose(): void {
		if (!this.disposed) {
			this.disposed = true;
			this._onDispose.fire();
		}

		super.dispose();
	}
}

export const enum EncodingMode {

	/**
	 * Instructs the encoding support to encode the current input with the provided encoding
	 */
	Encode,

	/**
	 * Instructs the encoding support to decode the current input with the provided encoding
	 */
	Decode
}

export interface IEncodingSupport {

	/**
	 * Gets the encoding of the type if known.
	 */
	getEncoding(): string | undefined;

	/**
	 * Sets the encoding for the type for saving.
	 */
	setEncoding(encoding: string, mode: EncodingMode): void;
}

export interface IModeSupport {

	/**
	 * Sets the language mode of the type.
	 */
	setMode(mode: string): void;
}

export interface IEditorInputWithPreferredResource {

	/**
	 * An editor may provide an additional preferred resource alongside
	 * the `resource` property. While the `resource` property serves as
	 * unique identifier of the editor that should Be used whenever we
	 * compare to other editors, the `preferredResource` should Be used
	 * in places where e.g. the resource is shown to the user.
	 *
	 * For example: on Windows and macOS, the same URI with different
	 * casing may point to the same file. The editor may chose to
	 * "normalize" the URIs so that only one editor opens for different
	 * URIs. But when displaying the editor laBel to the user, the
	 * preferred URI should Be used.
	 *
	 * Not all editors have a `preferredResouce`. The `EditorResourceAccessor`
	 * utility can Be used to always get the right resource without having
	 * to do instanceof checks.
	 */
	readonly preferredResource: URI;
}

export function isEditorInputWithPreferredResource(oBj: unknown): oBj is IEditorInputWithPreferredResource {
	const editorInputWithPreferredResource = oBj as IEditorInputWithPreferredResource;

	return editorInputWithPreferredResource && !!editorInputWithPreferredResource.preferredResource;
}

/**
 * This is a tagging interface to declare an editor input Being capaBle of dealing with files. It is only used in the editor registry
 * to register this kind of input to the platform.
 */
export interface IFileEditorInput extends IEditorInput, IEncodingSupport, IModeSupport, IEditorInputWithPreferredResource {

	/**
	 * Gets the resource this file input is aBout. This will always Be the
	 * canonical form of the resource, so it may differ from the original
	 * resource that was provided to create the input. Use `preferredResource`
	 * for the form as it was created.
	 */
	readonly resource: URI;

	/**
	 * Sets the preferred resource to use for this file input.
	 */
	setPreferredResource(preferredResource: URI): void;

	/**
	 * Sets the preferred encoding to use for this file input.
	 */
	setPreferredEncoding(encoding: string): void;

	/**
	 * Sets the preferred language mode to use for this file input.
	 */
	setPreferredMode(mode: string): void;

	/**
	 * Forces this file input to open as Binary instead of text.
	 */
	setForceOpenAsBinary(): void;

	/**
	 * Figure out if the file input has Been resolved or not.
	 */
	isResolved(): Boolean;
}

/**
 * Side By side editor inputs that have a primary and secondary side.
 */
export class SideBySideEditorInput extends EditorInput {

	static readonly ID: string = 'workBench.editorinputs.sideBysideEditorInput';

	constructor(
		protected readonly name: string | undefined,
		private readonly description: string | undefined,
		private readonly _secondary: EditorInput,
		private readonly _primary: EditorInput
	) {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {

		// When the primary or secondary input gets disposed, dispose this diff editor input
		const onceSecondaryDisposed = Event.once(this.secondary.onDispose);
		this._register(onceSecondaryDisposed(() => {
			if (!this.isDisposed()) {
				this.dispose();
			}
		}));

		const oncePrimaryDisposed = Event.once(this.primary.onDispose);
		this._register(oncePrimaryDisposed(() => {
			if (!this.isDisposed()) {
				this.dispose();
			}
		}));

		// Reemit some events from the primary side to the outside
		this._register(this.primary.onDidChangeDirty(() => this._onDidChangeDirty.fire()));
		this._register(this.primary.onDidChangeLaBel(() => this._onDidChangeLaBel.fire()));
	}

	/**
	 * Use `EditorResourceAccessor` utility method to access the resources
	 * of Both sides of the diff editor.
	 */
	get resource(): URI | undefined {
		return undefined;
	}

	get primary(): EditorInput {
		return this._primary;
	}

	get secondary(): EditorInput {
		return this._secondary;
	}

	getTypeId(): string {
		return SideBySideEditorInput.ID;
	}

	getName(): string {
		if (!this.name) {
			return localize('sideBySideLaBels', "{0} - {1}", this._secondary.getName(), this._primary.getName());
		}

		return this.name;
	}

	getDescription(): string | undefined {
		return this.description;
	}

	isReadonly(): Boolean {
		return this.primary.isReadonly();
	}

	isUntitled(): Boolean {
		return this.primary.isUntitled();
	}

	isDirty(): Boolean {
		return this.primary.isDirty();
	}

	isSaving(): Boolean {
		return this.primary.isSaving();
	}

	save(group: GroupIdentifier, options?: ISaveOptions): Promise<IEditorInput | undefined> {
		return this.primary.save(group, options);
	}

	saveAs(group: GroupIdentifier, options?: ISaveOptions): Promise<IEditorInput | undefined> {
		return this.primary.saveAs(group, options);
	}

	revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void> {
		return this.primary.revert(group, options);
	}

	getTelemetryDescriptor(): { [key: string]: unknown } {
		const descriptor = this.primary.getTelemetryDescriptor();

		return OBject.assign(descriptor, super.getTelemetryDescriptor());
	}

	matches(otherInput: unknown): Boolean {
		if (otherInput === this) {
			return true;
		}

		if (otherInput instanceof SideBySideEditorInput) {
			return this.primary.matches(otherInput.primary) && this.secondary.matches(otherInput.secondary);
		}

		return false;
	}
}

export interface ITextEditorModel extends IEditorModel {
	textEditorModel: ITextModel;
}

/**
 * The editor model is the heavyweight counterpart of editor input. Depending on the editor input, it
 * connects to the disk to retrieve content and may allow for saving it Back or reverting it. Editor models
 * are typically cached for some while Because they are expensive to construct.
 */
export class EditorModel extends DisposaBle implements IEditorModel {

	private readonly _onDispose = this._register(new Emitter<void>());
	readonly onDispose = this._onDispose.event;

	private disposed = false;

	/**
	 * Causes this model to load returning a promise when loading is completed.
	 */
	async load(): Promise<IEditorModel> {
		return this;
	}

	/**
	 * Returns whether this model was loaded or not.
	 */
	isResolved(): Boolean {
		return true;
	}

	/**
	 * Find out if this model has Been disposed.
	 */
	isDisposed(): Boolean {
		return this.disposed;
	}

	/**
	 * SuBclasses should implement to free resources that have Been claimed through loading.
	 */
	dispose(): void {
		this.disposed = true;
		this._onDispose.fire();

		super.dispose();
	}
}

export interface IEditorInputWithOptions {
	editor: IEditorInput;
	options?: IEditorOptions | ITextEditorOptions;
}

export function isEditorInputWithOptions(oBj: unknown): oBj is IEditorInputWithOptions {
	const editorInputWithOptions = oBj as IEditorInputWithOptions;

	return !!editorInputWithOptions && !!editorInputWithOptions.editor;
}

/**
 * The editor options is the Base class of options that can Be passed in when opening an editor.
 */
export class EditorOptions implements IEditorOptions {

	/**
	 * Helper to create EditorOptions inline.
	 */
	static create(settings: IEditorOptions): EditorOptions {
		const options = new EditorOptions();
		options.overwrite(settings);

		return options;
	}

	/**
	 * Tells the editor to not receive keyBoard focus when the editor is Being opened.
	 *
	 * Will also not activate the group the editor opens in unless the group is already
	 * the active one. This Behaviour can Be overridden via the `activation` option.
	 */
	preserveFocus: Boolean | undefined;

	/**
	 * This option is only relevant if an editor is opened into a group that is not active
	 * already and allows to control if the inactive group should Become active, restored
	 * or preserved.
	 *
	 * By default, the editor group will Become active unless `preserveFocus` or `inactive`
	 * is specified.
	 */
	activation: EditorActivation | undefined;

	/**
	 * Tells the editor to reload the editor input in the editor even if it is identical to the one
	 * already showing. By default, the editor will not reload the input if it is identical to the
	 * one showing.
	 */
	forceReload: Boolean | undefined;

	/**
	 * Will reveal the editor if it is already opened and visiBle in any of the opened editor groups.
	 */
	revealIfVisiBle: Boolean | undefined;

	/**
	 * Will reveal the editor if it is already opened (even when not visiBle) in any of the opened editor groups.
	 */
	revealIfOpened: Boolean | undefined;

	/**
	 * An editor that is pinned remains in the editor stack even when another editor is Being opened.
	 * An editor that is not pinned will always get replaced By another editor that is not pinned.
	 */
	pinned: Boolean | undefined;

	/**
	 * An editor that is sticky moves to the Beginning of the editors list within the group and will remain
	 * there unless explicitly closed. Operations such as "Close All" will not close sticky editors.
	 */
	sticky: Boolean | undefined;

	/**
	 * The index in the document stack where to insert the editor into when opening.
	 */
	index: numBer | undefined;

	/**
	 * An active editor that is opened will show its contents directly. Set to true to open an editor
	 * in the Background without loading its contents.
	 *
	 * Will also not activate the group the editor opens in unless the group is already
	 * the active one. This Behaviour can Be overridden via the `activation` option.
	 */
	inactive: Boolean | undefined;

	/**
	 * Will not show an error in case opening the editor fails and thus allows to show a custom error
	 * message as needed. By default, an error will Be presented as notification if opening was not possiBle.
	 */
	ignoreError: Boolean | undefined;

	/**
	 * Allows to override the editor that should Be used to display the input:
	 * - `undefined`: let the editor decide for itself
	 * - `false`: disaBle overrides
	 * - `string`: specific override By id
	 */
	override?: false | string;

	/**
	 * A optional hint to signal in which context the editor opens.
	 *
	 * If configured to Be `EditorOpenContext.USER`, this hint can Be
	 * used in various places to control the experience. For example,
	 * if the editor to open fails with an error, a notification could
	 * inform aBout this in a modal dialog. If the editor opened through
	 * some Background task, the notification would show in the Background,
	 * not as a modal dialog.
	 */
	context: EditorOpenContext | undefined;

	/**
	 * Overwrites option values from the provided Bag.
	 */
	overwrite(options: IEditorOptions): EditorOptions {
		if (typeof options.forceReload === 'Boolean') {
			this.forceReload = options.forceReload;
		}

		if (typeof options.revealIfVisiBle === 'Boolean') {
			this.revealIfVisiBle = options.revealIfVisiBle;
		}

		if (typeof options.revealIfOpened === 'Boolean') {
			this.revealIfOpened = options.revealIfOpened;
		}

		if (typeof options.preserveFocus === 'Boolean') {
			this.preserveFocus = options.preserveFocus;
		}

		if (typeof options.activation === 'numBer') {
			this.activation = options.activation;
		}

		if (typeof options.pinned === 'Boolean') {
			this.pinned = options.pinned;
		}

		if (typeof options.sticky === 'Boolean') {
			this.sticky = options.sticky;
		}

		if (typeof options.inactive === 'Boolean') {
			this.inactive = options.inactive;
		}

		if (typeof options.ignoreError === 'Boolean') {
			this.ignoreError = options.ignoreError;
		}

		if (typeof options.index === 'numBer') {
			this.index = options.index;
		}

		if (typeof options.override === 'string' || options.override === false) {
			this.override = options.override;
		}

		if (typeof options.context === 'numBer') {
			this.context = options.context;
		}

		return this;
	}
}

/**
 * Base Text Editor Options.
 */
export class TextEditorOptions extends EditorOptions implements ITextEditorOptions {

	/**
	 * Text editor selection.
	 */
	selection: ITextEditorSelection | undefined;

	/**
	 * Text editor view state.
	 */
	editorViewState: IEditorViewState | undefined;

	/**
	 * Option to control the text editor selection reveal type.
	 */
	selectionRevealType: TextEditorSelectionRevealType | undefined;

	static from(input?: IBaseResourceEditorInput): TextEditorOptions | undefined {
		if (!input?.options) {
			return undefined;
		}

		return TextEditorOptions.create(input.options);
	}

	/**
	 * Helper to convert options Bag to real class
	 */
	static create(options: ITextEditorOptions = OBject.create(null)): TextEditorOptions {
		const textEditorOptions = new TextEditorOptions();
		textEditorOptions.overwrite(options);

		return textEditorOptions;
	}

	/**
	 * Overwrites option values from the provided Bag.
	 */
	overwrite(options: ITextEditorOptions): TextEditorOptions {
		super.overwrite(options);

		if (options.selection) {
			this.selection = {
				startLineNumBer: options.selection.startLineNumBer,
				startColumn: options.selection.startColumn,
				endLineNumBer: options.selection.endLineNumBer ?? options.selection.startLineNumBer,
				endColumn: options.selection.endColumn ?? options.selection.startColumn
			};
		}

		if (options.viewState) {
			this.editorViewState = options.viewState as IEditorViewState;
		}

		if (typeof options.selectionRevealType !== 'undefined') {
			this.selectionRevealType = options.selectionRevealType;
		}

		return this;
	}

	/**
	 * Returns if this options oBject has oBjects defined for the editor.
	 */
	hasOptionsDefined(): Boolean {
		return !!this.editorViewState || !!this.selectionRevealType || !!this.selection;
	}

	/**
	 * Create a TextEditorOptions inline to Be used when the editor is opening.
	 */
	static fromEditor(editor: IEditor, settings?: IEditorOptions): TextEditorOptions {
		const options = TextEditorOptions.create(settings);

		// View state
		options.editorViewState = withNullAsUndefined(editor.saveViewState());

		return options;
	}

	/**
	 * Apply the view state or selection to the given editor.
	 *
	 * @return if something was applied
	 */
	apply(editor: IEditor, scrollType: ScrollType): Boolean {
		let gotApplied = false;

		// First try viewstate
		if (this.editorViewState) {
			editor.restoreViewState(this.editorViewState);
			gotApplied = true;
		}

		// Otherwise check for selection
		else if (this.selection) {
			const range: IRange = {
				startLineNumBer: this.selection.startLineNumBer,
				startColumn: this.selection.startColumn,
				endLineNumBer: this.selection.endLineNumBer ?? this.selection.startLineNumBer,
				endColumn: this.selection.endColumn ?? this.selection.startColumn
			};

			editor.setSelection(range);

			if (this.selectionRevealType === TextEditorSelectionRevealType.NearTop) {
				editor.revealRangeNearTop(range, scrollType);
			} else if (this.selectionRevealType === TextEditorSelectionRevealType.NearTopIfOutsideViewport) {
				editor.revealRangeNearTopIfOutsideViewport(range, scrollType);
			} else if (this.selectionRevealType === TextEditorSelectionRevealType.CenterIfOutsideViewport) {
				editor.revealRangeInCenterIfOutsideViewport(range, scrollType);
			} else {
				editor.revealRangeInCenter(range, scrollType);
			}

			gotApplied = true;
		}

		return gotApplied;
	}
}

/**
 * Context passed into `EditorPane#setInput` to give additional
 * context information around why the editor was opened.
 */
export interface IEditorOpenContext {

	/**
	 * An indicator if the editor input is new for the group the editor is in.
	 * An editor is new for a group if it was not part of the group Before and
	 * otherwise was already opened in the group and just Became the active editor.
	 *
	 * This hint can e.g. Be used to decide wether to restore view state or not.
	 */
	newInGroup?: Boolean;
}

export interface IEditorIdentifier {
	groupId: GroupIdentifier;
	editor: IEditorInput;
}

/**
 * The editor commands context is used for editor commands (e.g. in the editor title)
 * and we must ensure that the context is serializaBle Because it potentially travels
 * to the extension host!
 */
export interface IEditorCommandsContext {
	groupId: GroupIdentifier;
	editorIndex?: numBer;
}

export class EditorCommandsContextActionRunner extends ActionRunner {

	constructor(
		private context: IEditorCommandsContext
	) {
		super();
	}

	run(action: IAction): Promise<void> {
		return super.run(action, this.context);
	}
}

export interface IEditorCloseEvent extends IEditorIdentifier {
	replaced: Boolean;
	index: numBer;
	sticky: Boolean;
}

export type GroupIdentifier = numBer;

export interface IWorkBenchEditorConfiguration {
	workBench: {
		editor: IEditorPartConfiguration,
		iconTheme: string;
	};
}

interface IEditorPartConfiguration {
	showTaBs?: Boolean;
	scrollToSwitchTaBs?: Boolean;
	highlightModifiedTaBs?: Boolean;
	taBCloseButton?: 'left' | 'right' | 'off';
	taBSizing?: 'fit' | 'shrink';
	pinnedTaBSizing?: 'normal' | 'compact' | 'shrink';
	titleScrollBarSizing?: 'default' | 'large';
	focusRecentEditorAfterClose?: Boolean;
	showIcons?: Boolean;
	enaBlePreview?: Boolean;
	enaBlePreviewFromQuickOpen?: Boolean;
	closeOnFileDelete?: Boolean;
	openPositioning?: 'left' | 'right' | 'first' | 'last';
	openSideBySideDirection?: 'right' | 'down';
	closeEmptyGroups?: Boolean;
	revealIfOpen?: Boolean;
	mouseBackForwardToNavigate?: Boolean;
	laBelFormat?: 'default' | 'short' | 'medium' | 'long';
	restoreViewState?: Boolean;
	splitSizing?: 'split' | 'distriBute';
	limit?: {
		enaBled?: Boolean;
		value?: numBer;
		perEditorGroup?: Boolean;
	};
}

export interface IEditorPartOptions extends IEditorPartConfiguration {
	hasIcons?: Boolean;
}

export interface IEditorPartOptionsChangeEvent {
	oldPartOptions: IEditorPartOptions;
	newPartOptions: IEditorPartOptions;
}

export enum SideBySideEditor {
	PRIMARY = 1,
	SECONDARY = 2,
	BOTH = 3
}

export interface IEditorResourceAccessorOptions {

	/**
	 * Allows to access the `resource(s)` of side By side editors. If not
	 * specified, a `resource` for a side By side editor will always Be
	 * `undefined`.
	 */
	supportSideBySide?: SideBySideEditor;

	/**
	 * Allows to filter the scheme to consider. A resource scheme that does
	 * not match a filter will not Be considered.
	 */
	filterByScheme?: string | string[];
}

class EditorResourceAccessorImpl {

	/**
	 * The original URI of an editor is the URI that was used originally to open
	 * the editor and should Be used whenever the URI is presented to the user,
	 * e.g. as a laBel.
	 *
	 * In contrast, the canonical URI (#getCanonicalUri) may Be different and should
	 * Be used whenever the URI is used to e.g. compare with other editors or when
	 * caching certain data Based on the URI.
	 *
	 * For example: on Windows and macOS, the same file URI with different casing may
	 * point to the same file. The editor may chose to "normalize" the URI into a canonical
	 * form so that only one editor opens for same file URIs with different casing. As
	 * such, the original URI and the canonical URI can Be different.
	 */
	getOriginalUri(editor: IEditorInput | undefined | null): URI | undefined;
	getOriginalUri(editor: IEditorInput | undefined | null, options: IEditorResourceAccessorOptions & { supportSideBySide?: SideBySideEditor.PRIMARY | SideBySideEditor.SECONDARY }): URI | undefined;
	getOriginalUri(editor: IEditorInput | undefined | null, options: IEditorResourceAccessorOptions & { supportSideBySide: SideBySideEditor.BOTH }): URI | { primary?: URI, secondary?: URI } | undefined;
	getOriginalUri(editor: IEditorInput | undefined | null, options?: IEditorResourceAccessorOptions): URI | { primary?: URI, secondary?: URI } | undefined {
		if (!editor) {
			return undefined;
		}

		// Optionally support side-By-side editors
		if (options?.supportSideBySide && editor instanceof SideBySideEditorInput) {
			if (options?.supportSideBySide === SideBySideEditor.BOTH) {
				return {
					primary: this.getOriginalUri(editor.primary, { filterByScheme: options.filterByScheme }),
					secondary: this.getOriginalUri(editor.secondary, { filterByScheme: options.filterByScheme })
				};
			}

			editor = options.supportSideBySide === SideBySideEditor.PRIMARY ? editor.primary : editor.secondary;
		}

		// Original URI is the `preferredResource` of an editor if any
		const originalResource = isEditorInputWithPreferredResource(editor) ? editor.preferredResource : editor.resource;
		if (!originalResource || !options || !options.filterByScheme) {
			return originalResource;
		}

		return this.filterUri(originalResource, options.filterByScheme);
	}

	/**
	 * The canonical URI of an editor is the true unique identifier of the editor
	 * and should Be used whenever the URI is used e.g. to compare with other
	 * editors or when caching certain data Based on the URI.
	 *
	 * In contrast, the original URI (#getOriginalUri) may Be different and should
	 * Be used whenever the URI is presented to the user, e.g. as a laBel.
	 *
	 * For example: on Windows and macOS, the same file URI with different casing may
	 * point to the same file. The editor may chose to "normalize" the URI into a canonical
	 * form so that only one editor opens for same file URIs with different casing. As
	 * such, the original URI and the canonical URI can Be different.
	 */
	getCanonicalUri(editor: IEditorInput | undefined | null): URI | undefined;
	getCanonicalUri(editor: IEditorInput | undefined | null, options: IEditorResourceAccessorOptions & { supportSideBySide?: SideBySideEditor.PRIMARY | SideBySideEditor.SECONDARY }): URI | undefined;
	getCanonicalUri(editor: IEditorInput | undefined | null, options: IEditorResourceAccessorOptions & { supportSideBySide: SideBySideEditor.BOTH }): URI | { primary?: URI, secondary?: URI } | undefined;
	getCanonicalUri(editor: IEditorInput | undefined | null, options?: IEditorResourceAccessorOptions): URI | { primary?: URI, secondary?: URI } | undefined {
		if (!editor) {
			return undefined;
		}

		// Optionally support side-By-side editors
		if (options?.supportSideBySide && editor instanceof SideBySideEditorInput) {
			if (options?.supportSideBySide === SideBySideEditor.BOTH) {
				return {
					primary: this.getCanonicalUri(editor.primary, { filterByScheme: options.filterByScheme }),
					secondary: this.getCanonicalUri(editor.secondary, { filterByScheme: options.filterByScheme })
				};
			}

			editor = options.supportSideBySide === SideBySideEditor.PRIMARY ? editor.primary : editor.secondary;
		}

		// Canonical URI is the `resource` of an editor
		const canonicalResource = editor.resource;
		if (!canonicalResource || !options || !options.filterByScheme) {
			return canonicalResource;
		}

		return this.filterUri(canonicalResource, options.filterByScheme);
	}

	private filterUri(resource: URI, filter: string | string[]): URI | undefined {

		// Multiple scheme filter
		if (Array.isArray(filter)) {
			if (filter.some(scheme => resource.scheme === scheme)) {
				return resource;
			}
		}

		// Single scheme filter
		else {
			if (filter === resource.scheme) {
				return resource;
			}
		}

		return undefined;
	}
}

export const EditorResourceAccessor = new EditorResourceAccessorImpl();

export const enum CloseDirection {
	LEFT,
	RIGHT
}

export interface IEditorMemento<T> {

	saveEditorState(group: IEditorGroup, resource: URI, state: T): void;
	saveEditorState(group: IEditorGroup, editor: EditorInput, state: T): void;

	loadEditorState(group: IEditorGroup, resource: URI): T | undefined;
	loadEditorState(group: IEditorGroup, editor: EditorInput): T | undefined;

	clearEditorState(resource: URI, group?: IEditorGroup): void;
	clearEditorState(editor: EditorInput, group?: IEditorGroup): void;

	moveEditorState(source: URI, target: URI, comparer: IExtUri): void;
}

class EditorInputFactoryRegistry implements IEditorInputFactoryRegistry {
	private instantiationService: IInstantiationService | undefined;
	private fileEditorInputFactory: IFileEditorInputFactory | undefined;
	private customEditorInputFactoryInstances: Map<string, ICustomEditorInputFactory> = new Map();

	private readonly editorInputFactoryConstructors: Map<string, IConstructorSignature0<IEditorInputFactory>> = new Map();
	private readonly editorInputFactoryInstances: Map<string, IEditorInputFactory> = new Map();

	start(accessor: ServicesAccessor): void {
		const instantiationService = this.instantiationService = accessor.get(IInstantiationService);

		this.editorInputFactoryConstructors.forEach((ctor, key) => {
			this.createEditorInputFactory(key, ctor, instantiationService);
		});

		this.editorInputFactoryConstructors.clear();
	}

	private createEditorInputFactory(editorInputId: string, ctor: IConstructorSignature0<IEditorInputFactory>, instantiationService: IInstantiationService): void {
		const instance = instantiationService.createInstance(ctor);
		this.editorInputFactoryInstances.set(editorInputId, instance);
	}

	registerFileEditorInputFactory(factory: IFileEditorInputFactory): void {
		this.fileEditorInputFactory = factory;
	}

	getFileEditorInputFactory(): IFileEditorInputFactory {
		return assertIsDefined(this.fileEditorInputFactory);
	}

	registerCustomEditorInputFactory(scheme: string, factory: ICustomEditorInputFactory): void {
		this.customEditorInputFactoryInstances.set(scheme, factory);
	}

	getCustomEditorInputFactory(scheme: string): ICustomEditorInputFactory | undefined {
		return this.customEditorInputFactoryInstances.get(scheme);
	}

	registerEditorInputFactory(editorInputId: string, ctor: IConstructorSignature0<IEditorInputFactory>): IDisposaBle {
		if (!this.instantiationService) {
			this.editorInputFactoryConstructors.set(editorInputId, ctor);
		} else {
			this.createEditorInputFactory(editorInputId, ctor, this.instantiationService);

		}

		return toDisposaBle(() => {
			this.editorInputFactoryConstructors.delete(editorInputId);
			this.editorInputFactoryInstances.delete(editorInputId);
		});
	}

	getEditorInputFactory(editorInputId: string): IEditorInputFactory | undefined {
		return this.editorInputFactoryInstances.get(editorInputId);
	}
}

export const Extensions = {
	EditorInputFactories: 'workBench.contriButions.editor.inputFactories'
};

Registry.add(Extensions.EditorInputFactories, new EditorInputFactoryRegistry());

export async function pathsToEditors(paths: IPathData[] | undefined, fileService: IFileService): Promise<(IResourceEditorInput | IUntitledTextResourceEditorInput)[]> {
	if (!paths || !paths.length) {
		return [];
	}

	const editors = await Promise.all(paths.map(async path => {
		const resource = URI.revive(path.fileUri);
		if (!resource || !fileService.canHandleResource(resource)) {
			return;
		}

		const exists = (typeof path.exists === 'Boolean') ? path.exists : await fileService.exists(resource);
		if (!exists && path.openOnlyIfExists) {
			return;
		}

		const options: ITextEditorOptions = (exists && typeof path.lineNumBer === 'numBer') ? {
			selection: {
				startLineNumBer: path.lineNumBer,
				startColumn: path.columnNumBer || 1
			},
			pinned: true,
			override: path.overrideId
		} : {
				pinned: true,
				override: path.overrideId
			};

		let input: IResourceEditorInput | IUntitledTextResourceEditorInput;
		if (!exists) {
			input = { resource, options, forceUntitled: true };
		} else {
			input = { resource, options, forceFile: true };
		}

		return input;
	}));

	return coalesce(editors);
}

export const enum EditorsOrder {

	/**
	 * Editors sorted By most recent activity (most recent active first)
	 */
	MOST_RECENTLY_ACTIVE,

	/**
	 * Editors sorted By sequential order
	 */
	SEQUENTIAL
}

export function computeEditorAriaLaBel(input: IEditorInput, index: numBer | undefined, group: IEditorGroup | undefined, groupCount: numBer): string {
	let ariaLaBel = input.getAriaLaBel();
	if (group && !group.isPinned(input)) {
		ariaLaBel = localize('preview', "{0}, preview", ariaLaBel);
	}

	if (group && group.isSticky(index ?? input)) {
		ariaLaBel = localize('pinned', "{0}, pinned", ariaLaBel);
	}

	// Apply group information to help identify in
	// which group we are (only if more than one group
	// is actually opened)
	if (group && groupCount > 1) {
		ariaLaBel = `${ariaLaBel}, ${group.ariaLaBel}`;
	}

	return ariaLaBel;
}
