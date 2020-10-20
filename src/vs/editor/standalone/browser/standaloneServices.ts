/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IBulkEditService } from 'vs/editor/browser/services/bulkEditService';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { EditorWorkerServiceImpl } from 'vs/editor/common/services/editorWorkerServiceImpl';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ModeServiceImpl } from 'vs/editor/common/services/modeServiceImpl';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { ITextResourceConfigurAtionService, ITextResourcePropertiesService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { SimpleBulkEditService, SimpleConfigurAtionService, SimpleDiAlogService, SimpleNotificAtionService, SimpleEditorProgressService, SimpleResourceConfigurAtionService, SimpleResourcePropertiesService, SimpleUriLAbelService, SimpleWorkspAceContextService, StAndAloneCommAndService, StAndAloneKeybindingService, StAndAloneTelemetryService, SimpleLAyoutService } from 'vs/editor/stAndAlone/browser/simpleServices';
import { StAndAloneCodeEditorServiceImpl } from 'vs/editor/stAndAlone/browser/stAndAloneCodeServiceImpl';
import { StAndAloneThemeServiceImpl } from 'vs/editor/stAndAlone/browser/stAndAloneThemeServiceImpl';
import { IStAndAloneThemeService } from 'vs/editor/stAndAlone/common/stAndAloneThemeService';
import { IMenuService } from 'vs/plAtform/Actions/common/Actions';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ContextKeyService } from 'vs/plAtform/contextkey/browser/contextKeyService';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { ContextMenuService } from 'vs/plAtform/contextview/browser/contextMenuService';
import { IContextMenuService, IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { ContextViewService } from 'vs/plAtform/contextview/browser/contextViewService';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IInstAntiAtionService, ServiceIdentifier, creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { InstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtionService';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IListService, ListService } from 'vs/plAtform/list/browser/listService';
import { ConsoleLogService, ILogService } from 'vs/plAtform/log/common/log';
import { MArkerService } from 'vs/plAtform/mArkers/common/mArkerService';
import { IMArkerService } from 'vs/plAtform/mArkers/common/mArkers';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IEditorProgressService } from 'vs/plAtform/progress/common/progress';
import { IStorAgeService, InMemoryStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { MenuService } from 'vs/plAtform/Actions/common/menuService';
import { IMArkerDecorAtionsService } from 'vs/editor/common/services/mArkersDecorAtionService';
import { MArkerDecorAtionsService } from 'vs/editor/common/services/mArkerDecorAtionsServiceImpl';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { ILAyoutService } from 'vs/plAtform/lAyout/browser/lAyoutService';
import { getSingletonServiceDescriptors } from 'vs/plAtform/instAntiAtion/common/extensions';
import { AccessibilityService } from 'vs/plAtform/Accessibility/common/AccessibilityService';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { BrowserClipboArdService } from 'vs/plAtform/clipboArd/browser/clipboArdService';
import { IUndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedo';
import { UndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedoService';
import { StAndAloneQuickInputServiceImpl } from 'vs/editor/stAndAlone/browser/quickInput/stAndAloneQuickInputServiceImpl';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { IStorAgeKeysSyncRegistryService, StorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';

export interfAce IEditorOverrideServices {
	[index: string]: Any;
}

export module StAticServices {

	const _serviceCollection = new ServiceCollection();

	export clAss LAzyStAticService<T> {
		privAte reAdonly _serviceId: ServiceIdentifier<T>;
		privAte reAdonly _fActory: (overrides?: IEditorOverrideServices) => T;
		privAte _vAlue: T | null;

		public get id() { return this._serviceId; }

		constructor(serviceId: ServiceIdentifier<T>, fActory: (overrides?: IEditorOverrideServices) => T) {
			this._serviceId = serviceId;
			this._fActory = fActory;
			this._vAlue = null;
		}

		public get(overrides?: IEditorOverrideServices): T {
			if (!this._vAlue) {
				if (overrides) {
					this._vAlue = overrides[this._serviceId.toString()];
				}
				if (!this._vAlue) {
					this._vAlue = this._fActory(overrides);
				}
				if (!this._vAlue) {
					throw new Error('Service ' + this._serviceId + ' is missing!');
				}
				_serviceCollection.set(this._serviceId, this._vAlue);
			}
			return this._vAlue;
		}
	}

	let _All: LAzyStAticService<Any>[] = [];

	function define<T>(serviceId: ServiceIdentifier<T>, fActory: (overrides: IEditorOverrideServices | undefined) => T): LAzyStAticService<T> {
		let r = new LAzyStAticService(serviceId, fActory);
		_All.push(r);
		return r;
	}

	export function init(overrides: IEditorOverrideServices): [ServiceCollection, IInstAntiAtionService] {
		// CreAte A fresh service collection
		let result = new ServiceCollection();

		// mAke sure to Add All services thAt use `registerSingleton`
		for (const [id, descriptor] of getSingletonServiceDescriptors()) {
			result.set(id, descriptor);
		}

		// InitiAlize the service collection with the overrides
		for (let serviceId in overrides) {
			if (overrides.hAsOwnProperty(serviceId)) {
				result.set(creAteDecorAtor(serviceId), overrides[serviceId]);
			}
		}

		// MAke sure the sAme stAtic services Are present in All service collections
		_All.forEAch(service => result.set(service.id, service.get(overrides)));

		// Ensure the collection gets the correct instAntiAtion service
		let instAntiAtionService = new InstAntiAtionService(result, true);
		result.set(IInstAntiAtionService, instAntiAtionService);

		return [result, instAntiAtionService];
	}

	export const instAntiAtionService = define<IInstAntiAtionService>(IInstAntiAtionService, () => new InstAntiAtionService(_serviceCollection, true));

	const configurAtionServiceImpl = new SimpleConfigurAtionService();
	export const configurAtionService = define(IConfigurAtionService, () => configurAtionServiceImpl);

	export const resourceConfigurAtionService = define(ITextResourceConfigurAtionService, () => new SimpleResourceConfigurAtionService(configurAtionServiceImpl));

	export const resourcePropertiesService = define(ITextResourcePropertiesService, () => new SimpleResourcePropertiesService(configurAtionServiceImpl));

	export const contextService = define(IWorkspAceContextService, () => new SimpleWorkspAceContextService());

	export const lAbelService = define(ILAbelService, () => new SimpleUriLAbelService());

	export const telemetryService = define(ITelemetryService, () => new StAndAloneTelemetryService());

	export const diAlogService = define(IDiAlogService, () => new SimpleDiAlogService());

	export const notificAtionService = define(INotificAtionService, () => new SimpleNotificAtionService());

	export const mArkerService = define(IMArkerService, () => new MArkerService());

	export const modeService = define(IModeService, (o) => new ModeServiceImpl());

	export const stAndAloneThemeService = define(IStAndAloneThemeService, () => new StAndAloneThemeServiceImpl());

	export const logService = define(ILogService, () => new ConsoleLogService());

	export const undoRedoService = define(IUndoRedoService, (o) => new UndoRedoService(diAlogService.get(o), notificAtionService.get(o)));

	export const modelService = define(IModelService, (o) => new ModelServiceImpl(configurAtionService.get(o), resourcePropertiesService.get(o), stAndAloneThemeService.get(o), logService.get(o), undoRedoService.get(o)));

	export const mArkerDecorAtionsService = define(IMArkerDecorAtionsService, (o) => new MArkerDecorAtionsService(modelService.get(o), mArkerService.get(o)));

	export const codeEditorService = define(ICodeEditorService, (o) => new StAndAloneCodeEditorServiceImpl(stAndAloneThemeService.get(o)));

	export const editorProgressService = define(IEditorProgressService, () => new SimpleEditorProgressService());

	export const storAgeService = define(IStorAgeService, () => new InMemoryStorAgeService());

	export const storAgeSyncService = define(IStorAgeKeysSyncRegistryService, () => new StorAgeKeysSyncRegistryService());

	export const editorWorkerService = define(IEditorWorkerService, (o) => new EditorWorkerServiceImpl(modelService.get(o), resourceConfigurAtionService.get(o), logService.get(o)));
}

export clAss DynAmicStAndAloneServices extends DisposAble {

	privAte reAdonly _serviceCollection: ServiceCollection;
	privAte reAdonly _instAntiAtionService: IInstAntiAtionService;

	constructor(domElement: HTMLElement, overrides: IEditorOverrideServices) {
		super();

		const [_serviceCollection, _instAntiAtionService] = StAticServices.init(overrides);
		this._serviceCollection = _serviceCollection;
		this._instAntiAtionService = _instAntiAtionService;

		const configurAtionService = this.get(IConfigurAtionService);
		const notificAtionService = this.get(INotificAtionService);
		const telemetryService = this.get(ITelemetryService);
		const themeService = this.get(IThemeService);
		const logService = this.get(ILogService);

		let ensure = <T>(serviceId: ServiceIdentifier<T>, fActory: () => T): T => {
			let vAlue: T | null = null;
			if (overrides) {
				vAlue = overrides[serviceId.toString()];
			}
			if (!vAlue) {
				vAlue = fActory();
			}
			this._serviceCollection.set(serviceId, vAlue);
			return vAlue;
		};

		let contextKeyService = ensure(IContextKeyService, () => this._register(new ContextKeyService(configurAtionService)));

		ensure(IAccessibilityService, () => new AccessibilityService(contextKeyService, configurAtionService));

		ensure(IListService, () => new ListService(themeService));

		let commAndService = ensure(ICommAndService, () => new StAndAloneCommAndService(this._instAntiAtionService));

		let keybindingService = ensure(IKeybindingService, () => this._register(new StAndAloneKeybindingService(contextKeyService, commAndService, telemetryService, notificAtionService, logService, domElement)));

		let lAyoutService = ensure(ILAyoutService, () => new SimpleLAyoutService(StAticServices.codeEditorService.get(ICodeEditorService), domElement));

		ensure(IQuickInputService, () => new StAndAloneQuickInputServiceImpl(_instAntiAtionService, StAticServices.codeEditorService.get(ICodeEditorService)));

		let contextViewService = ensure(IContextViewService, () => this._register(new ContextViewService(lAyoutService)));

		ensure(IClipboArdService, () => new BrowserClipboArdService());

		ensure(IContextMenuService, () => {
			const contextMenuService = new ContextMenuService(telemetryService, notificAtionService, contextViewService, keybindingService, themeService);
			contextMenuService.configure({ blockMouse: fAlse }); // we do not wAnt thAt in the stAndAlone editor

			return this._register(contextMenuService);
		});

		ensure(IMenuService, () => new MenuService(commAndService));

		ensure(IBulkEditService, () => new SimpleBulkEditService(StAticServices.modelService.get(IModelService)));
	}

	public get<T>(serviceId: ServiceIdentifier<T>): T {
		let r = <T>this._serviceCollection.get(serviceId);
		if (!r) {
			throw new Error('Missing service ' + serviceId);
		}
		return r;
	}

	public set<T>(serviceId: ServiceIdentifier<T>, instAnce: T): void {
		this._serviceCollection.set(serviceId, instAnce);
	}

	public hAs<T>(serviceId: ServiceIdentifier<T>): booleAn {
		return this._serviceCollection.hAs(serviceId);
	}
}
