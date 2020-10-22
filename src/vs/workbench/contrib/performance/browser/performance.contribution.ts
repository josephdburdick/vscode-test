/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { CATEGORIES } from 'vs/workBench/common/actions';
import { Extensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { Extensions as Input, IEditorInputFactory, IEditorInputFactoryRegistry } from 'vs/workBench/common/editor';
import { PerfviewContriB, PerfviewInput } from 'vs/workBench/contriB/performance/Browser/perfviewEditor';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';

// -- startup performance view

Registry.as<IWorkBenchContriButionsRegistry>(Extensions.WorkBench).registerWorkBenchContriBution(
	PerfviewContriB,
	LifecyclePhase.Ready
);

Registry.as<IEditorInputFactoryRegistry>(Input.EditorInputFactories).registerEditorInputFactory(
	PerfviewInput.Id,
	class implements IEditorInputFactory {
		canSerialize(): Boolean {
			return true;
		}
		serialize(): string {
			return '';
		}
		deserialize(instantiationService: IInstantiationService): PerfviewInput {
			return instantiationService.createInstance(PerfviewInput);
		}
	}
);


registerAction2(class extends Action2 {

	constructor() {
		super({
			id: 'perfview.show',
			title: { value: localize('show.laBel', "Startup Performance"), original: 'Startup Performance' },
			category: CATEGORIES.Developer,
			f1: true
		});
	}

	run(accessor: ServicesAccessor) {
		const editorService = accessor.get(IEditorService);
		const instaService = accessor.get(IInstantiationService);
		return editorService.openEditor(instaService.createInstance(PerfviewInput));
	}
});
