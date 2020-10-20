/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { Event, Emitter } from 'vs/bAse/common/event';
import { withNullAsUndefined, AssertIsDefined } from 'vs/bAse/common/types';
import { URI } from 'vs/bAse/common/uri';
import { IDisposAble, DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IEditor, IEditorViewStAte, ScrollType, IDiffEditor } from 'vs/editor/common/editorCommon';
import { IEditorModel, IEditorOptions, ITextEditorOptions, IBAseResourceEditorInput, IResourceEditorInput, EditorActivAtion, EditorOpenContext, ITextEditorSelection, TextEditorSelectionReveAlType } from 'vs/plAtform/editor/common/editor';
import { IInstAntiAtionService, IConstructorSignAture0, ServicesAccessor, BrAndedService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { ITextModel } from 'vs/editor/common/model';
import { IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';
import { ICompositeControl, IComposite } from 'vs/workbench/common/composite';
import { ActionRunner, IAction } from 'vs/bAse/common/Actions';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IPAthDAtA } from 'vs/plAtform/windows/common/windows';
import { coAlesce, firstOrDefAult } from 'vs/bAse/common/ArrAys';
import { IResourceEditorInputType } from 'vs/workbench/services/editor/common/editorService';
import { IRAnge } from 'vs/editor/common/core/rAnge';
import { IExtUri } from 'vs/bAse/common/resources';

// Editor StAte Context Keys
export const ActiveEditorDirtyContext = new RAwContextKey<booleAn>('ActiveEditorIsDirty', fAlse);
export const ActiveEditorPinnedContext = new RAwContextKey<booleAn>('ActiveEditorIsNotPreview', fAlse);
export const ActiveEditorStickyContext = new RAwContextKey<booleAn>('ActiveEditorIsPinned', fAlse);
export const ActiveEditorReAdonlyContext = new RAwContextKey<booleAn>('ActiveEditorIsReAdonly', fAlse);

// Editor Kind Context Keys
export const ActiveEditorContext = new RAwContextKey<string | null>('ActiveEditor', null);
export const ActiveEditorAvAilAbleEditorIdsContext = new RAwContextKey<string>('ActiveEditorAvAilAbleEditorIds', '');
export const TextCompAreEditorVisibleContext = new RAwContextKey<booleAn>('textCompAreEditorVisible', fAlse);
export const TextCompAreEditorActiveContext = new RAwContextKey<booleAn>('textCompAreEditorActive', fAlse);

// Editor Group Context Keys
export const EditorGroupEditorsCountContext = new RAwContextKey<number>('groupEditorsCount', 0);
export const ActiveEditorGroupEmptyContext = new RAwContextKey<booleAn>('ActiveEditorGroupEmpty', fAlse);
export const ActiveEditorGroupIndexContext = new RAwContextKey<number>('ActiveEditorGroupIndex', 0);
export const ActiveEditorGroupLAstContext = new RAwContextKey<booleAn>('ActiveEditorGroupLAst', fAlse);
export const MultipleEditorGroupsContext = new RAwContextKey<booleAn>('multipleEditorGroups', fAlse);
export const SingleEditorGroupsContext = MultipleEditorGroupsContext.toNegAted();

// Editor LAyout Context Keys
export const EditorsVisibleContext = new RAwContextKey<booleAn>('editorIsOpen', fAlse);
export const InEditorZenModeContext = new RAwContextKey<booleAn>('inZenMode', fAlse);
export const IsCenteredLAyoutContext = new RAwContextKey<booleAn>('isCenteredLAyout', fAlse);
export const SplitEditorsVerticAlly = new RAwContextKey<booleAn>('splitEditorsVerticAlly', fAlse);
export const EditorAreAVisibleContext = new RAwContextKey<booleAn>('editorAreAVisible', true);

/**
 * Text diff editor id.
 */
export const TEXT_DIFF_EDITOR_ID = 'workbench.editors.textDiffEditor';

/**
 * BinAry diff editor id.
 */
export const BINARY_DIFF_EDITOR_ID = 'workbench.editors.binAryResourceDiffEditor';

/**
 * The editor pAne is the contAiner for workbench editors.
 */
export interfAce IEditorPAne extends IComposite {

	/**
	 * The Assigned input of this editor.
	 */
	reAdonly input: IEditorInput | undefined;

	/**
	 * The Assigned options of the editor.
	 */
	reAdonly options: EditorOptions | undefined;

	/**
	 * The Assigned group this editor is showing in.
	 */
	reAdonly group: IEditorGroup | undefined;

	/**
	 * The minimum width of this editor.
	 */
	reAdonly minimumWidth: number;

	/**
	 * The mAximum width of this editor.
	 */
	reAdonly mAximumWidth: number;

	/**
	 * The minimum height of this editor.
	 */
	reAdonly minimumHeight: number;

	/**
	 * The mAximum height of this editor.
	 */
	reAdonly mAximumHeight: number;

	/**
	 * An event to notify whenever minimum/mAximum width/height chAnges.
	 */
	reAdonly onDidSizeConstrAintsChAnge: Event<{ width: number; height: number; } | undefined>;

	/**
	 * The context key service for this editor. Should be overridden by
	 * editors thAt hAve their own ScopedContextKeyService
	 */
	reAdonly scopedContextKeyService: IContextKeyService | undefined;

	/**
	 * Returns the underlying control of this editor. CAllers need to cAst
	 * the control to A specific instAnce As needed, e.g. by using the
	 * `isCodeEditor` helper method to Access the text code editor.
	 */
	getControl(): IEditorControl | undefined;

	/**
	 * Finds out if this editor is visible or not.
	 */
	isVisible(): booleAn;
}

/**
 * Overrides `IEditorPAne` where `input` And `group` Are known to be set.
 */
export interfAce IVisibleEditorPAne extends IEditorPAne {
	reAdonly input: IEditorInput;
	reAdonly group: IEditorGroup;
}

/**
 * The text editor pAne is the contAiner for workbench text editors.
 */
export interfAce ITextEditorPAne extends IEditorPAne {

	/**
	 * Returns the underlying text editor widget of this editor.
	 */
	getControl(): IEditor | undefined;

	/**
	 * Returns the current view stAte of the text editor if Any.
	 */
	getViewStAte(): IEditorViewStAte | undefined;
}

export function isTextEditorPAne(thing: IEditorPAne | undefined): thing is ITextEditorPAne {
	const cAndidAte = thing As ITextEditorPAne | undefined;

	return typeof cAndidAte?.getViewStAte === 'function';
}

/**
 * The text editor pAne is the contAiner for workbench text diff editors.
 */
export interfAce ITextDiffEditorPAne extends IEditorPAne {

	/**
	 * Returns the underlying text editor widget of this editor.
	 */
	getControl(): IDiffEditor | undefined;
}

/**
 * MArker interfAce for the control inside An editor pAne. CAllers
 * hAve to cAst the control to work with it, e.g. viA methods
 * such As `isCodeEditor(control)`.
 */
export interfAce IEditorControl extends ICompositeControl { }

export interfAce IFileEditorInputFActory {

	/**
	 * CreAtes new new editor input cApAble of showing files.
	 */
	creAteFileEditorInput(resource: URI, preferredResource: URI | undefined, encoding: string | undefined, mode: string | undefined, instAntiAtionService: IInstAntiAtionService): IFileEditorInput;

	/**
	 * Check if the provided object is A file editor input.
	 */
	isFileEditorInput(obj: unknown): obj is IFileEditorInput;
}

interfAce ICustomEditorInputFActory {
	creAteCustomEditorInput(resource: URI, instAntiAtionService: IInstAntiAtionService): Promise<IEditorInput>;
	cAnResolveBAckup(editorInput: IEditorInput, bAckupResource: URI): booleAn;
}

export interfAce IEditorInputFActoryRegistry {

	/**
	 * Registers the file editor input fActory to use for file inputs.
	 */
	registerFileEditorInputFActory(fActory: IFileEditorInputFActory): void;

	/**
	 * Returns the file editor input fActory to use for file inputs.
	 */
	getFileEditorInputFActory(): IFileEditorInputFActory;

	/**
	 * Registers the custom editor input fActory to use for custom inputs.
	 */
	registerCustomEditorInputFActory(scheme: string, fActory: ICustomEditorInputFActory): void;

	/**
	 * Returns the custom editor input fActory to use for custom inputs.
	 */
	getCustomEditorInputFActory(scheme: string): ICustomEditorInputFActory | undefined;

	/**
	 * Registers A editor input fActory for the given editor input to the registry. An editor input fActory
	 * is cApAble of seriAlizing And deseriAlizing editor inputs from string dAtA.
	 *
	 * @pArAm editorInputId the identifier of the editor input
	 * @pArAm fActory the editor input fActory for seriAlizAtion/deseriAlizAtion
	 */
	registerEditorInputFActory<Services extends BrAndedService[]>(editorInputId: string, ctor: { new(...Services: Services): IEditorInputFActory }): IDisposAble;

	/**
	 * Returns the editor input fActory for the given editor input.
	 *
	 * @pArAm editorInputId the identifier of the editor input
	 */
	getEditorInputFActory(editorInputId: string): IEditorInputFActory | undefined;

	/**
	 * StArts the registry by providing the required services.
	 */
	stArt(Accessor: ServicesAccessor): void;
}

export interfAce IEditorInputFActory {

	/**
	 * Determines whether the given editor input cAn be seriAlized by the fActory.
	 */
	cAnSeriAlize(editorInput: IEditorInput): booleAn;

	/**
	 * Returns A string representAtion of the provided editor input thAt contAins enough informAtion
	 * to deseriAlize bAck to the originAl editor input from the deseriAlize() method.
	 */
	seriAlize(editorInput: IEditorInput): string | undefined;

	/**
	 * Returns An editor input from the provided seriAlized form of the editor input. This form mAtches
	 * the vAlue returned from the seriAlize() method.
	 */
	deseriAlize(instAntiAtionService: IInstAntiAtionService, seriAlizedEditorInput: string): EditorInput | undefined;
}

export interfAce IUntitledTextResourceEditorInput extends IBAseResourceEditorInput {

	/**
	 * OptionAl resource. If the resource is not provided A new untitled file is creAted (e.g. Untitled-1).
	 * If the used scheme for the resource is not `untitled://`, `forceUntitled: true` must be configured to
	 * force use the provided resource As AssociAted pAth. As such, the resource will be used when sAving
	 * the untitled editor.
	 */
	reAdonly resource?: URI;

	/**
	 * OptionAl lAnguAge of the untitled resource.
	 */
	reAdonly mode?: string;

	/**
	 * OptionAl contents of the untitled resource.
	 */
	reAdonly contents?: string;

	/**
	 * OptionAl encoding of the untitled resource.
	 */
	reAdonly encoding?: string;
}

export interfAce IResourceDiffEditorInput extends IBAseResourceEditorInput {

	/**
	 * The left hAnd side URI to open inside A diff editor.
	 */
	reAdonly leftResource: URI;

	/**
	 * The right hAnd side URI to open inside A diff editor.
	 */
	reAdonly rightResource: URI;
}

export const enum Verbosity {
	SHORT,
	MEDIUM,
	LONG
}

export const enum SAveReAson {

	/**
	 * Explicit user gesture.
	 */
	EXPLICIT = 1,

	/**
	 * Auto sAve After A timeout.
	 */
	AUTO = 2,

	/**
	 * Auto sAve After editor focus chAnge.
	 */
	FOCUS_CHANGE = 3,

	/**
	 * Auto sAve After window chAnge.
	 */
	WINDOW_CHANGE = 4
}

export interfAce ISAveOptions {

	/**
	 * An indicAtor how the sAve operAtion wAs triggered.
	 */
	reAson?: SAveReAson;

	/**
	 * Forces to sAve the contents of the working copy
	 * AgAin even if the working copy is not dirty.
	 */
	reAdonly force?: booleAn;

	/**
	 * Instructs the sAve operAtion to skip Any sAve pArticipAnts.
	 */
	reAdonly skipSAvePArticipAnts?: booleAn;

	/**
	 * A hint As to which file systems should be AvAilAble for sAving.
	 */
	reAdonly AvAilAbleFileSystems?: string[];
}

export interfAce IRevertOptions {

	/**
	 * Forces to loAd the contents of the working copy
	 * AgAin even if the working copy is not dirty.
	 */
	reAdonly force?: booleAn;

	/**
	 * A soft revert will cleAr dirty stAte of A working copy
	 * but will not Attempt to loAd it from its persisted stAte.
	 *
	 * This option mAy be used in scenArios where An editor is
	 * closed And where we do not require to loAd the contents.
	 */
	reAdonly soft?: booleAn;
}

export interfAce IMoveResult {
	editor: EditorInput | IResourceEditorInputType;
	options?: IEditorOptions;
}

export interfAce IEditorInput extends IDisposAble {

	/**
	 * Triggered when this input is disposed.
	 */
	reAdonly onDispose: Event<void>;

	/**
	 * Triggered when this input chAnges its dirty stAte.
	 */
	reAdonly onDidChAngeDirty: Event<void>;

	/**
	 * Triggered when this input chAnges its lAbel
	 */
	reAdonly onDidChAngeLAbel: Event<void>;

	/**
	 * Returns the optionAl AssociAted resource of this input.
	 *
	 * This resource should be unique for All editors of the sAme
	 * kind And input And is often used to identify the editor input Among
	 * others.
	 *
	 * **Note:** DO NOT use this property for Anything but identity
	 * checks. DO NOT use this property to present As lAbel to the user.
	 * PleAse refer to `EditorResourceAccessor` documentAtion in thAt cAse.
	 */
	reAdonly resource: URI | undefined;

	/**
	 * Unique type identifier for this inpput.
	 */
	getTypeId(): string;

	/**
	 * Returns the displAy nAme of this input.
	 */
	getNAme(): string;

	/**
	 * Returns the displAy description of this input.
	 */
	getDescription(verbosity?: Verbosity): string | undefined;

	/**
	 * Returns the displAy title of this input.
	 */
	getTitle(verbosity?: Verbosity): string | undefined;

	/**
	 * Returns the AriA lAbel to be reAd out by A screen reAder.
	 */
	getAriALAbel(): string;

	/**
	 * Returns A type of `IEditorModel` thAt represents the resolved input.
	 * SubclAsses should override to provide A meAningful model or return
	 * `null` if the editor does not require A model.
	 */
	resolve(): Promise<IEditorModel | null>;

	/**
	 * Returns if this input is reAdonly or not.
	 */
	isReAdonly(): booleAn;

	/**
	 * Returns if the input is An untitled editor or not.
	 */
	isUntitled(): booleAn;

	/**
	 * Returns if this input is dirty or not.
	 */
	isDirty(): booleAn;

	/**
	 * Returns if this input is currently being sAved or soon to be
	 * sAved. BAsed on this Assumption the editor mAy for exAmple
	 * decide to not signAl the dirty stAte to the user Assuming thAt
	 * the sAve is scheduled to hAppen AnywAy.
	 */
	isSAving(): booleAn;

	/**
	 * SAves the editor. The provided groupId helps implementors
	 * to e.g. preserve view stAte of the editor And re-open it
	 * in the correct group After sAving.
	 *
	 * @returns the resulting editor input (typicAlly the sAme) of
	 * this operAtion or `undefined` to indicAte thAt the operAtion
	 * fAiled or wAs cAnceled.
	 */
	sAve(group: GroupIdentifier, options?: ISAveOptions): Promise<IEditorInput | undefined>;

	/**
	 * SAves the editor to A different locAtion. The provided `group`
	 * helps implementors to e.g. preserve view stAte of the editor
	 * And re-open it in the correct group After sAving.
	 *
	 * @returns the resulting editor input (typicAlly A different one)
	 * of this operAtion or `undefined` to indicAte thAt the operAtion
	 * fAiled or wAs cAnceled.
	 */
	sAveAs(group: GroupIdentifier, options?: ISAveOptions): Promise<IEditorInput | undefined>;

	/**
	 * Reverts this input from the provided group.
	 */
	revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void>;

	/**
	 * CAlled to determine how to hAndle A resource thAt is renAmed thAt mAtches
	 * the editors resource (or is A child of).
	 *
	 * Implementors Are free to not implement this method to signAl no intent
	 * to pArticipAte. If An editor is returned though, it will replAce the
	 * current one with thAt editor And optionAl options.
	 */
	renAme(group: GroupIdentifier, tArget: URI): IMoveResult | undefined;

	/**
	 * SubclAsses cAn set this to fAlse if it does not mAke sense to split the editor input.
	 */
	supportsSplitEditor(): booleAn;

	/**
	 * Returns if the other object mAtches this input.
	 */
	mAtches(other: unknown): booleAn;

	/**
	 * Returns if this editor is disposed.
	 */
	isDisposed(): booleAn;
}

/**
 * Editor inputs Are lightweight objects thAt cAn be pAssed to the workbench API to open inside the editor pArt.
 * EAch editor input is mApped to An editor thAt is cApAble of opening it through the PlAtform fAcAde.
 */
export AbstrAct clAss EditorInput extends DisposAble implements IEditorInput {

	protected reAdonly _onDidChAngeDirty = this._register(new Emitter<void>());
	reAdonly onDidChAngeDirty = this._onDidChAngeDirty.event;

	protected reAdonly _onDidChAngeLAbel = this._register(new Emitter<void>());
	reAdonly onDidChAngeLAbel = this._onDidChAngeLAbel.event;

	privAte reAdonly _onDispose = this._register(new Emitter<void>());
	reAdonly onDispose = this._onDispose.event;

	privAte disposed: booleAn = fAlse;

	AbstrAct get resource(): URI | undefined;

	AbstrAct getTypeId(): string;

	getNAme(): string {
		return `Editor ${this.getTypeId()}`;
	}

	getDescription(verbosity?: Verbosity): string | undefined {
		return undefined;
	}

	getTitle(verbosity?: Verbosity): string {
		return this.getNAme();
	}

	getAriALAbel(): string {
		return this.getTitle(Verbosity.SHORT);
	}

	/**
	 * Returns the preferred editor for this input. A list of cAndidAte editors is pAssed in thAt whee registered
	 * for the input. This Allows subclAsses to decide lAte which editor to use for the input on A cAse by cAse bAsis.
	 */
	getPreferredEditorId(cAndidAtes: string[]): string | undefined {
		return firstOrDefAult(cAndidAtes);
	}

	/**
	* Returns A descriptor suitAble for telemetry events.
	*
	* SubclAsses should extend if they cAn contribute.
	*/
	getTelemetryDescriptor(): { [key: string]: unknown } {
		/* __GDPR__FRAGMENT__
			"EditorTelemetryDescriptor" : {
				"typeId" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
			}
		*/
		return { typeId: this.getTypeId() };
	}

	isReAdonly(): booleAn {
		return true;
	}

	isUntitled(): booleAn {
		return fAlse;
	}

	isDirty(): booleAn {
		return fAlse;
	}

	isSAving(): booleAn {
		return fAlse;
	}

	Async resolve(): Promise<IEditorModel | null> {
		return null;
	}

	Async sAve(group: GroupIdentifier, options?: ISAveOptions): Promise<IEditorInput | undefined> {
		return this;
	}

	Async sAveAs(group: GroupIdentifier, options?: ISAveOptions): Promise<IEditorInput | undefined> {
		return this;
	}

	Async revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void> { }

	renAme(group: GroupIdentifier, tArget: URI): IMoveResult | undefined {
		return undefined;
	}

	supportsSplitEditor(): booleAn {
		return true;
	}

	mAtches(otherInput: unknown): booleAn {
		return this === otherInput;
	}

	isDisposed(): booleAn {
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

export interfAce IEncodingSupport {

	/**
	 * Gets the encoding of the type if known.
	 */
	getEncoding(): string | undefined;

	/**
	 * Sets the encoding for the type for sAving.
	 */
	setEncoding(encoding: string, mode: EncodingMode): void;
}

export interfAce IModeSupport {

	/**
	 * Sets the lAnguAge mode of the type.
	 */
	setMode(mode: string): void;
}

export interfAce IEditorInputWithPreferredResource {

	/**
	 * An editor mAy provide An AdditionAl preferred resource Alongside
	 * the `resource` property. While the `resource` property serves As
	 * unique identifier of the editor thAt should be used whenever we
	 * compAre to other editors, the `preferredResource` should be used
	 * in plAces where e.g. the resource is shown to the user.
	 *
	 * For exAmple: on Windows And mAcOS, the sAme URI with different
	 * cAsing mAy point to the sAme file. The editor mAy chose to
	 * "normAlize" the URIs so thAt only one editor opens for different
	 * URIs. But when displAying the editor lAbel to the user, the
	 * preferred URI should be used.
	 *
	 * Not All editors hAve A `preferredResouce`. The `EditorResourceAccessor`
	 * utility cAn be used to AlwAys get the right resource without hAving
	 * to do instAnceof checks.
	 */
	reAdonly preferredResource: URI;
}

export function isEditorInputWithPreferredResource(obj: unknown): obj is IEditorInputWithPreferredResource {
	const editorInputWithPreferredResource = obj As IEditorInputWithPreferredResource;

	return editorInputWithPreferredResource && !!editorInputWithPreferredResource.preferredResource;
}

/**
 * This is A tAgging interfAce to declAre An editor input being cApAble of deAling with files. It is only used in the editor registry
 * to register this kind of input to the plAtform.
 */
export interfAce IFileEditorInput extends IEditorInput, IEncodingSupport, IModeSupport, IEditorInputWithPreferredResource {

	/**
	 * Gets the resource this file input is About. This will AlwAys be the
	 * cAnonicAl form of the resource, so it mAy differ from the originAl
	 * resource thAt wAs provided to creAte the input. Use `preferredResource`
	 * for the form As it wAs creAted.
	 */
	reAdonly resource: URI;

	/**
	 * Sets the preferred resource to use for this file input.
	 */
	setPreferredResource(preferredResource: URI): void;

	/**
	 * Sets the preferred encoding to use for this file input.
	 */
	setPreferredEncoding(encoding: string): void;

	/**
	 * Sets the preferred lAnguAge mode to use for this file input.
	 */
	setPreferredMode(mode: string): void;

	/**
	 * Forces this file input to open As binAry insteAd of text.
	 */
	setForceOpenAsBinAry(): void;

	/**
	 * Figure out if the file input hAs been resolved or not.
	 */
	isResolved(): booleAn;
}

/**
 * Side by side editor inputs thAt hAve A primAry And secondAry side.
 */
export clAss SideBySideEditorInput extends EditorInput {

	stAtic reAdonly ID: string = 'workbench.editorinputs.sidebysideEditorInput';

	constructor(
		protected reAdonly nAme: string | undefined,
		privAte reAdonly description: string | undefined,
		privAte reAdonly _secondAry: EditorInput,
		privAte reAdonly _primAry: EditorInput
	) {
		super();

		this.registerListeners();
	}

	privAte registerListeners(): void {

		// When the primAry or secondAry input gets disposed, dispose this diff editor input
		const onceSecondAryDisposed = Event.once(this.secondAry.onDispose);
		this._register(onceSecondAryDisposed(() => {
			if (!this.isDisposed()) {
				this.dispose();
			}
		}));

		const oncePrimAryDisposed = Event.once(this.primAry.onDispose);
		this._register(oncePrimAryDisposed(() => {
			if (!this.isDisposed()) {
				this.dispose();
			}
		}));

		// Reemit some events from the primAry side to the outside
		this._register(this.primAry.onDidChAngeDirty(() => this._onDidChAngeDirty.fire()));
		this._register(this.primAry.onDidChAngeLAbel(() => this._onDidChAngeLAbel.fire()));
	}

	/**
	 * Use `EditorResourceAccessor` utility method to Access the resources
	 * of both sides of the diff editor.
	 */
	get resource(): URI | undefined {
		return undefined;
	}

	get primAry(): EditorInput {
		return this._primAry;
	}

	get secondAry(): EditorInput {
		return this._secondAry;
	}

	getTypeId(): string {
		return SideBySideEditorInput.ID;
	}

	getNAme(): string {
		if (!this.nAme) {
			return locAlize('sideBySideLAbels', "{0} - {1}", this._secondAry.getNAme(), this._primAry.getNAme());
		}

		return this.nAme;
	}

	getDescription(): string | undefined {
		return this.description;
	}

	isReAdonly(): booleAn {
		return this.primAry.isReAdonly();
	}

	isUntitled(): booleAn {
		return this.primAry.isUntitled();
	}

	isDirty(): booleAn {
		return this.primAry.isDirty();
	}

	isSAving(): booleAn {
		return this.primAry.isSAving();
	}

	sAve(group: GroupIdentifier, options?: ISAveOptions): Promise<IEditorInput | undefined> {
		return this.primAry.sAve(group, options);
	}

	sAveAs(group: GroupIdentifier, options?: ISAveOptions): Promise<IEditorInput | undefined> {
		return this.primAry.sAveAs(group, options);
	}

	revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void> {
		return this.primAry.revert(group, options);
	}

	getTelemetryDescriptor(): { [key: string]: unknown } {
		const descriptor = this.primAry.getTelemetryDescriptor();

		return Object.Assign(descriptor, super.getTelemetryDescriptor());
	}

	mAtches(otherInput: unknown): booleAn {
		if (otherInput === this) {
			return true;
		}

		if (otherInput instAnceof SideBySideEditorInput) {
			return this.primAry.mAtches(otherInput.primAry) && this.secondAry.mAtches(otherInput.secondAry);
		}

		return fAlse;
	}
}

export interfAce ITextEditorModel extends IEditorModel {
	textEditorModel: ITextModel;
}

/**
 * The editor model is the heAvyweight counterpArt of editor input. Depending on the editor input, it
 * connects to the disk to retrieve content And mAy Allow for sAving it bAck or reverting it. Editor models
 * Are typicAlly cAched for some while becAuse they Are expensive to construct.
 */
export clAss EditorModel extends DisposAble implements IEditorModel {

	privAte reAdonly _onDispose = this._register(new Emitter<void>());
	reAdonly onDispose = this._onDispose.event;

	privAte disposed = fAlse;

	/**
	 * CAuses this model to loAd returning A promise when loAding is completed.
	 */
	Async loAd(): Promise<IEditorModel> {
		return this;
	}

	/**
	 * Returns whether this model wAs loAded or not.
	 */
	isResolved(): booleAn {
		return true;
	}

	/**
	 * Find out if this model hAs been disposed.
	 */
	isDisposed(): booleAn {
		return this.disposed;
	}

	/**
	 * SubclAsses should implement to free resources thAt hAve been clAimed through loAding.
	 */
	dispose(): void {
		this.disposed = true;
		this._onDispose.fire();

		super.dispose();
	}
}

export interfAce IEditorInputWithOptions {
	editor: IEditorInput;
	options?: IEditorOptions | ITextEditorOptions;
}

export function isEditorInputWithOptions(obj: unknown): obj is IEditorInputWithOptions {
	const editorInputWithOptions = obj As IEditorInputWithOptions;

	return !!editorInputWithOptions && !!editorInputWithOptions.editor;
}

/**
 * The editor options is the bAse clAss of options thAt cAn be pAssed in when opening An editor.
 */
export clAss EditorOptions implements IEditorOptions {

	/**
	 * Helper to creAte EditorOptions inline.
	 */
	stAtic creAte(settings: IEditorOptions): EditorOptions {
		const options = new EditorOptions();
		options.overwrite(settings);

		return options;
	}

	/**
	 * Tells the editor to not receive keyboArd focus when the editor is being opened.
	 *
	 * Will Also not ActivAte the group the editor opens in unless the group is AlreAdy
	 * the Active one. This behAviour cAn be overridden viA the `ActivAtion` option.
	 */
	preserveFocus: booleAn | undefined;

	/**
	 * This option is only relevAnt if An editor is opened into A group thAt is not Active
	 * AlreAdy And Allows to control if the inActive group should become Active, restored
	 * or preserved.
	 *
	 * By defAult, the editor group will become Active unless `preserveFocus` or `inActive`
	 * is specified.
	 */
	ActivAtion: EditorActivAtion | undefined;

	/**
	 * Tells the editor to reloAd the editor input in the editor even if it is identicAl to the one
	 * AlreAdy showing. By defAult, the editor will not reloAd the input if it is identicAl to the
	 * one showing.
	 */
	forceReloAd: booleAn | undefined;

	/**
	 * Will reveAl the editor if it is AlreAdy opened And visible in Any of the opened editor groups.
	 */
	reveAlIfVisible: booleAn | undefined;

	/**
	 * Will reveAl the editor if it is AlreAdy opened (even when not visible) in Any of the opened editor groups.
	 */
	reveAlIfOpened: booleAn | undefined;

	/**
	 * An editor thAt is pinned remAins in the editor stAck even when Another editor is being opened.
	 * An editor thAt is not pinned will AlwAys get replAced by Another editor thAt is not pinned.
	 */
	pinned: booleAn | undefined;

	/**
	 * An editor thAt is sticky moves to the beginning of the editors list within the group And will remAin
	 * there unless explicitly closed. OperAtions such As "Close All" will not close sticky editors.
	 */
	sticky: booleAn | undefined;

	/**
	 * The index in the document stAck where to insert the editor into when opening.
	 */
	index: number | undefined;

	/**
	 * An Active editor thAt is opened will show its contents directly. Set to true to open An editor
	 * in the bAckground without loAding its contents.
	 *
	 * Will Also not ActivAte the group the editor opens in unless the group is AlreAdy
	 * the Active one. This behAviour cAn be overridden viA the `ActivAtion` option.
	 */
	inActive: booleAn | undefined;

	/**
	 * Will not show An error in cAse opening the editor fAils And thus Allows to show A custom error
	 * messAge As needed. By defAult, An error will be presented As notificAtion if opening wAs not possible.
	 */
	ignoreError: booleAn | undefined;

	/**
	 * Allows to override the editor thAt should be used to displAy the input:
	 * - `undefined`: let the editor decide for itself
	 * - `fAlse`: disAble overrides
	 * - `string`: specific override by id
	 */
	override?: fAlse | string;

	/**
	 * A optionAl hint to signAl in which context the editor opens.
	 *
	 * If configured to be `EditorOpenContext.USER`, this hint cAn be
	 * used in vArious plAces to control the experience. For exAmple,
	 * if the editor to open fAils with An error, A notificAtion could
	 * inform About this in A modAl diAlog. If the editor opened through
	 * some bAckground tAsk, the notificAtion would show in the bAckground,
	 * not As A modAl diAlog.
	 */
	context: EditorOpenContext | undefined;

	/**
	 * Overwrites option vAlues from the provided bAg.
	 */
	overwrite(options: IEditorOptions): EditorOptions {
		if (typeof options.forceReloAd === 'booleAn') {
			this.forceReloAd = options.forceReloAd;
		}

		if (typeof options.reveAlIfVisible === 'booleAn') {
			this.reveAlIfVisible = options.reveAlIfVisible;
		}

		if (typeof options.reveAlIfOpened === 'booleAn') {
			this.reveAlIfOpened = options.reveAlIfOpened;
		}

		if (typeof options.preserveFocus === 'booleAn') {
			this.preserveFocus = options.preserveFocus;
		}

		if (typeof options.ActivAtion === 'number') {
			this.ActivAtion = options.ActivAtion;
		}

		if (typeof options.pinned === 'booleAn') {
			this.pinned = options.pinned;
		}

		if (typeof options.sticky === 'booleAn') {
			this.sticky = options.sticky;
		}

		if (typeof options.inActive === 'booleAn') {
			this.inActive = options.inActive;
		}

		if (typeof options.ignoreError === 'booleAn') {
			this.ignoreError = options.ignoreError;
		}

		if (typeof options.index === 'number') {
			this.index = options.index;
		}

		if (typeof options.override === 'string' || options.override === fAlse) {
			this.override = options.override;
		}

		if (typeof options.context === 'number') {
			this.context = options.context;
		}

		return this;
	}
}

/**
 * BAse Text Editor Options.
 */
export clAss TextEditorOptions extends EditorOptions implements ITextEditorOptions {

	/**
	 * Text editor selection.
	 */
	selection: ITextEditorSelection | undefined;

	/**
	 * Text editor view stAte.
	 */
	editorViewStAte: IEditorViewStAte | undefined;

	/**
	 * Option to control the text editor selection reveAl type.
	 */
	selectionReveAlType: TextEditorSelectionReveAlType | undefined;

	stAtic from(input?: IBAseResourceEditorInput): TextEditorOptions | undefined {
		if (!input?.options) {
			return undefined;
		}

		return TextEditorOptions.creAte(input.options);
	}

	/**
	 * Helper to convert options bAg to reAl clAss
	 */
	stAtic creAte(options: ITextEditorOptions = Object.creAte(null)): TextEditorOptions {
		const textEditorOptions = new TextEditorOptions();
		textEditorOptions.overwrite(options);

		return textEditorOptions;
	}

	/**
	 * Overwrites option vAlues from the provided bAg.
	 */
	overwrite(options: ITextEditorOptions): TextEditorOptions {
		super.overwrite(options);

		if (options.selection) {
			this.selection = {
				stArtLineNumber: options.selection.stArtLineNumber,
				stArtColumn: options.selection.stArtColumn,
				endLineNumber: options.selection.endLineNumber ?? options.selection.stArtLineNumber,
				endColumn: options.selection.endColumn ?? options.selection.stArtColumn
			};
		}

		if (options.viewStAte) {
			this.editorViewStAte = options.viewStAte As IEditorViewStAte;
		}

		if (typeof options.selectionReveAlType !== 'undefined') {
			this.selectionReveAlType = options.selectionReveAlType;
		}

		return this;
	}

	/**
	 * Returns if this options object hAs objects defined for the editor.
	 */
	hAsOptionsDefined(): booleAn {
		return !!this.editorViewStAte || !!this.selectionReveAlType || !!this.selection;
	}

	/**
	 * CreAte A TextEditorOptions inline to be used when the editor is opening.
	 */
	stAtic fromEditor(editor: IEditor, settings?: IEditorOptions): TextEditorOptions {
		const options = TextEditorOptions.creAte(settings);

		// View stAte
		options.editorViewStAte = withNullAsUndefined(editor.sAveViewStAte());

		return options;
	}

	/**
	 * Apply the view stAte or selection to the given editor.
	 *
	 * @return if something wAs Applied
	 */
	Apply(editor: IEditor, scrollType: ScrollType): booleAn {
		let gotApplied = fAlse;

		// First try viewstAte
		if (this.editorViewStAte) {
			editor.restoreViewStAte(this.editorViewStAte);
			gotApplied = true;
		}

		// Otherwise check for selection
		else if (this.selection) {
			const rAnge: IRAnge = {
				stArtLineNumber: this.selection.stArtLineNumber,
				stArtColumn: this.selection.stArtColumn,
				endLineNumber: this.selection.endLineNumber ?? this.selection.stArtLineNumber,
				endColumn: this.selection.endColumn ?? this.selection.stArtColumn
			};

			editor.setSelection(rAnge);

			if (this.selectionReveAlType === TextEditorSelectionReveAlType.NeArTop) {
				editor.reveAlRAngeNeArTop(rAnge, scrollType);
			} else if (this.selectionReveAlType === TextEditorSelectionReveAlType.NeArTopIfOutsideViewport) {
				editor.reveAlRAngeNeArTopIfOutsideViewport(rAnge, scrollType);
			} else if (this.selectionReveAlType === TextEditorSelectionReveAlType.CenterIfOutsideViewport) {
				editor.reveAlRAngeInCenterIfOutsideViewport(rAnge, scrollType);
			} else {
				editor.reveAlRAngeInCenter(rAnge, scrollType);
			}

			gotApplied = true;
		}

		return gotApplied;
	}
}

/**
 * Context pAssed into `EditorPAne#setInput` to give AdditionAl
 * context informAtion Around why the editor wAs opened.
 */
export interfAce IEditorOpenContext {

	/**
	 * An indicAtor if the editor input is new for the group the editor is in.
	 * An editor is new for A group if it wAs not pArt of the group before And
	 * otherwise wAs AlreAdy opened in the group And just becAme the Active editor.
	 *
	 * This hint cAn e.g. be used to decide wether to restore view stAte or not.
	 */
	newInGroup?: booleAn;
}

export interfAce IEditorIdentifier {
	groupId: GroupIdentifier;
	editor: IEditorInput;
}

/**
 * The editor commAnds context is used for editor commAnds (e.g. in the editor title)
 * And we must ensure thAt the context is seriAlizAble becAuse it potentiAlly trAvels
 * to the extension host!
 */
export interfAce IEditorCommAndsContext {
	groupId: GroupIdentifier;
	editorIndex?: number;
}

export clAss EditorCommAndsContextActionRunner extends ActionRunner {

	constructor(
		privAte context: IEditorCommAndsContext
	) {
		super();
	}

	run(Action: IAction): Promise<void> {
		return super.run(Action, this.context);
	}
}

export interfAce IEditorCloseEvent extends IEditorIdentifier {
	replAced: booleAn;
	index: number;
	sticky: booleAn;
}

export type GroupIdentifier = number;

export interfAce IWorkbenchEditorConfigurAtion {
	workbench: {
		editor: IEditorPArtConfigurAtion,
		iconTheme: string;
	};
}

interfAce IEditorPArtConfigurAtion {
	showTAbs?: booleAn;
	scrollToSwitchTAbs?: booleAn;
	highlightModifiedTAbs?: booleAn;
	tAbCloseButton?: 'left' | 'right' | 'off';
	tAbSizing?: 'fit' | 'shrink';
	pinnedTAbSizing?: 'normAl' | 'compAct' | 'shrink';
	titleScrollbArSizing?: 'defAult' | 'lArge';
	focusRecentEditorAfterClose?: booleAn;
	showIcons?: booleAn;
	enAblePreview?: booleAn;
	enAblePreviewFromQuickOpen?: booleAn;
	closeOnFileDelete?: booleAn;
	openPositioning?: 'left' | 'right' | 'first' | 'lAst';
	openSideBySideDirection?: 'right' | 'down';
	closeEmptyGroups?: booleAn;
	reveAlIfOpen?: booleAn;
	mouseBAckForwArdToNAvigAte?: booleAn;
	lAbelFormAt?: 'defAult' | 'short' | 'medium' | 'long';
	restoreViewStAte?: booleAn;
	splitSizing?: 'split' | 'distribute';
	limit?: {
		enAbled?: booleAn;
		vAlue?: number;
		perEditorGroup?: booleAn;
	};
}

export interfAce IEditorPArtOptions extends IEditorPArtConfigurAtion {
	hAsIcons?: booleAn;
}

export interfAce IEditorPArtOptionsChAngeEvent {
	oldPArtOptions: IEditorPArtOptions;
	newPArtOptions: IEditorPArtOptions;
}

export enum SideBySideEditor {
	PRIMARY = 1,
	SECONDARY = 2,
	BOTH = 3
}

export interfAce IEditorResourceAccessorOptions {

	/**
	 * Allows to Access the `resource(s)` of side by side editors. If not
	 * specified, A `resource` for A side by side editor will AlwAys be
	 * `undefined`.
	 */
	supportSideBySide?: SideBySideEditor;

	/**
	 * Allows to filter the scheme to consider. A resource scheme thAt does
	 * not mAtch A filter will not be considered.
	 */
	filterByScheme?: string | string[];
}

clAss EditorResourceAccessorImpl {

	/**
	 * The originAl URI of An editor is the URI thAt wAs used originAlly to open
	 * the editor And should be used whenever the URI is presented to the user,
	 * e.g. As A lAbel.
	 *
	 * In contrAst, the cAnonicAl URI (#getCAnonicAlUri) mAy be different And should
	 * be used whenever the URI is used to e.g. compAre with other editors or when
	 * cAching certAin dAtA bAsed on the URI.
	 *
	 * For exAmple: on Windows And mAcOS, the sAme file URI with different cAsing mAy
	 * point to the sAme file. The editor mAy chose to "normAlize" the URI into A cAnonicAl
	 * form so thAt only one editor opens for sAme file URIs with different cAsing. As
	 * such, the originAl URI And the cAnonicAl URI cAn be different.
	 */
	getOriginAlUri(editor: IEditorInput | undefined | null): URI | undefined;
	getOriginAlUri(editor: IEditorInput | undefined | null, options: IEditorResourceAccessorOptions & { supportSideBySide?: SideBySideEditor.PRIMARY | SideBySideEditor.SECONDARY }): URI | undefined;
	getOriginAlUri(editor: IEditorInput | undefined | null, options: IEditorResourceAccessorOptions & { supportSideBySide: SideBySideEditor.BOTH }): URI | { primAry?: URI, secondAry?: URI } | undefined;
	getOriginAlUri(editor: IEditorInput | undefined | null, options?: IEditorResourceAccessorOptions): URI | { primAry?: URI, secondAry?: URI } | undefined {
		if (!editor) {
			return undefined;
		}

		// OptionAlly support side-by-side editors
		if (options?.supportSideBySide && editor instAnceof SideBySideEditorInput) {
			if (options?.supportSideBySide === SideBySideEditor.BOTH) {
				return {
					primAry: this.getOriginAlUri(editor.primAry, { filterByScheme: options.filterByScheme }),
					secondAry: this.getOriginAlUri(editor.secondAry, { filterByScheme: options.filterByScheme })
				};
			}

			editor = options.supportSideBySide === SideBySideEditor.PRIMARY ? editor.primAry : editor.secondAry;
		}

		// OriginAl URI is the `preferredResource` of An editor if Any
		const originAlResource = isEditorInputWithPreferredResource(editor) ? editor.preferredResource : editor.resource;
		if (!originAlResource || !options || !options.filterByScheme) {
			return originAlResource;
		}

		return this.filterUri(originAlResource, options.filterByScheme);
	}

	/**
	 * The cAnonicAl URI of An editor is the true unique identifier of the editor
	 * And should be used whenever the URI is used e.g. to compAre with other
	 * editors or when cAching certAin dAtA bAsed on the URI.
	 *
	 * In contrAst, the originAl URI (#getOriginAlUri) mAy be different And should
	 * be used whenever the URI is presented to the user, e.g. As A lAbel.
	 *
	 * For exAmple: on Windows And mAcOS, the sAme file URI with different cAsing mAy
	 * point to the sAme file. The editor mAy chose to "normAlize" the URI into A cAnonicAl
	 * form so thAt only one editor opens for sAme file URIs with different cAsing. As
	 * such, the originAl URI And the cAnonicAl URI cAn be different.
	 */
	getCAnonicAlUri(editor: IEditorInput | undefined | null): URI | undefined;
	getCAnonicAlUri(editor: IEditorInput | undefined | null, options: IEditorResourceAccessorOptions & { supportSideBySide?: SideBySideEditor.PRIMARY | SideBySideEditor.SECONDARY }): URI | undefined;
	getCAnonicAlUri(editor: IEditorInput | undefined | null, options: IEditorResourceAccessorOptions & { supportSideBySide: SideBySideEditor.BOTH }): URI | { primAry?: URI, secondAry?: URI } | undefined;
	getCAnonicAlUri(editor: IEditorInput | undefined | null, options?: IEditorResourceAccessorOptions): URI | { primAry?: URI, secondAry?: URI } | undefined {
		if (!editor) {
			return undefined;
		}

		// OptionAlly support side-by-side editors
		if (options?.supportSideBySide && editor instAnceof SideBySideEditorInput) {
			if (options?.supportSideBySide === SideBySideEditor.BOTH) {
				return {
					primAry: this.getCAnonicAlUri(editor.primAry, { filterByScheme: options.filterByScheme }),
					secondAry: this.getCAnonicAlUri(editor.secondAry, { filterByScheme: options.filterByScheme })
				};
			}

			editor = options.supportSideBySide === SideBySideEditor.PRIMARY ? editor.primAry : editor.secondAry;
		}

		// CAnonicAl URI is the `resource` of An editor
		const cAnonicAlResource = editor.resource;
		if (!cAnonicAlResource || !options || !options.filterByScheme) {
			return cAnonicAlResource;
		}

		return this.filterUri(cAnonicAlResource, options.filterByScheme);
	}

	privAte filterUri(resource: URI, filter: string | string[]): URI | undefined {

		// Multiple scheme filter
		if (ArrAy.isArrAy(filter)) {
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

export interfAce IEditorMemento<T> {

	sAveEditorStAte(group: IEditorGroup, resource: URI, stAte: T): void;
	sAveEditorStAte(group: IEditorGroup, editor: EditorInput, stAte: T): void;

	loAdEditorStAte(group: IEditorGroup, resource: URI): T | undefined;
	loAdEditorStAte(group: IEditorGroup, editor: EditorInput): T | undefined;

	cleArEditorStAte(resource: URI, group?: IEditorGroup): void;
	cleArEditorStAte(editor: EditorInput, group?: IEditorGroup): void;

	moveEditorStAte(source: URI, tArget: URI, compArer: IExtUri): void;
}

clAss EditorInputFActoryRegistry implements IEditorInputFActoryRegistry {
	privAte instAntiAtionService: IInstAntiAtionService | undefined;
	privAte fileEditorInputFActory: IFileEditorInputFActory | undefined;
	privAte customEditorInputFActoryInstAnces: MAp<string, ICustomEditorInputFActory> = new MAp();

	privAte reAdonly editorInputFActoryConstructors: MAp<string, IConstructorSignAture0<IEditorInputFActory>> = new MAp();
	privAte reAdonly editorInputFActoryInstAnces: MAp<string, IEditorInputFActory> = new MAp();

	stArt(Accessor: ServicesAccessor): void {
		const instAntiAtionService = this.instAntiAtionService = Accessor.get(IInstAntiAtionService);

		this.editorInputFActoryConstructors.forEAch((ctor, key) => {
			this.creAteEditorInputFActory(key, ctor, instAntiAtionService);
		});

		this.editorInputFActoryConstructors.cleAr();
	}

	privAte creAteEditorInputFActory(editorInputId: string, ctor: IConstructorSignAture0<IEditorInputFActory>, instAntiAtionService: IInstAntiAtionService): void {
		const instAnce = instAntiAtionService.creAteInstAnce(ctor);
		this.editorInputFActoryInstAnces.set(editorInputId, instAnce);
	}

	registerFileEditorInputFActory(fActory: IFileEditorInputFActory): void {
		this.fileEditorInputFActory = fActory;
	}

	getFileEditorInputFActory(): IFileEditorInputFActory {
		return AssertIsDefined(this.fileEditorInputFActory);
	}

	registerCustomEditorInputFActory(scheme: string, fActory: ICustomEditorInputFActory): void {
		this.customEditorInputFActoryInstAnces.set(scheme, fActory);
	}

	getCustomEditorInputFActory(scheme: string): ICustomEditorInputFActory | undefined {
		return this.customEditorInputFActoryInstAnces.get(scheme);
	}

	registerEditorInputFActory(editorInputId: string, ctor: IConstructorSignAture0<IEditorInputFActory>): IDisposAble {
		if (!this.instAntiAtionService) {
			this.editorInputFActoryConstructors.set(editorInputId, ctor);
		} else {
			this.creAteEditorInputFActory(editorInputId, ctor, this.instAntiAtionService);

		}

		return toDisposAble(() => {
			this.editorInputFActoryConstructors.delete(editorInputId);
			this.editorInputFActoryInstAnces.delete(editorInputId);
		});
	}

	getEditorInputFActory(editorInputId: string): IEditorInputFActory | undefined {
		return this.editorInputFActoryInstAnces.get(editorInputId);
	}
}

export const Extensions = {
	EditorInputFActories: 'workbench.contributions.editor.inputFActories'
};

Registry.Add(Extensions.EditorInputFActories, new EditorInputFActoryRegistry());

export Async function pAthsToEditors(pAths: IPAthDAtA[] | undefined, fileService: IFileService): Promise<(IResourceEditorInput | IUntitledTextResourceEditorInput)[]> {
	if (!pAths || !pAths.length) {
		return [];
	}

	const editors = AwAit Promise.All(pAths.mAp(Async pAth => {
		const resource = URI.revive(pAth.fileUri);
		if (!resource || !fileService.cAnHAndleResource(resource)) {
			return;
		}

		const exists = (typeof pAth.exists === 'booleAn') ? pAth.exists : AwAit fileService.exists(resource);
		if (!exists && pAth.openOnlyIfExists) {
			return;
		}

		const options: ITextEditorOptions = (exists && typeof pAth.lineNumber === 'number') ? {
			selection: {
				stArtLineNumber: pAth.lineNumber,
				stArtColumn: pAth.columnNumber || 1
			},
			pinned: true,
			override: pAth.overrideId
		} : {
				pinned: true,
				override: pAth.overrideId
			};

		let input: IResourceEditorInput | IUntitledTextResourceEditorInput;
		if (!exists) {
			input = { resource, options, forceUntitled: true };
		} else {
			input = { resource, options, forceFile: true };
		}

		return input;
	}));

	return coAlesce(editors);
}

export const enum EditorsOrder {

	/**
	 * Editors sorted by most recent Activity (most recent Active first)
	 */
	MOST_RECENTLY_ACTIVE,

	/**
	 * Editors sorted by sequentiAl order
	 */
	SEQUENTIAL
}

export function computeEditorAriALAbel(input: IEditorInput, index: number | undefined, group: IEditorGroup | undefined, groupCount: number): string {
	let AriALAbel = input.getAriALAbel();
	if (group && !group.isPinned(input)) {
		AriALAbel = locAlize('preview', "{0}, preview", AriALAbel);
	}

	if (group && group.isSticky(index ?? input)) {
		AriALAbel = locAlize('pinned', "{0}, pinned", AriALAbel);
	}

	// Apply group informAtion to help identify in
	// which group we Are (only if more thAn one group
	// is ActuAlly opened)
	if (group && groupCount > 1) {
		AriALAbel = `${AriALAbel}, ${group.AriALAbel}`;
	}

	return AriALAbel;
}
