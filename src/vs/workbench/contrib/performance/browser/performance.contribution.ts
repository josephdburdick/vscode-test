/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { registerAction2, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { CATEGORIES } from 'vs/workbench/common/Actions';
import { Extensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { Extensions As Input, IEditorInputFActory, IEditorInputFActoryRegistry } from 'vs/workbench/common/editor';
import { PerfviewContrib, PerfviewInput } from 'vs/workbench/contrib/performAnce/browser/perfviewEditor';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';

// -- stArtup performAnce view

Registry.As<IWorkbenchContributionsRegistry>(Extensions.Workbench).registerWorkbenchContribution(
	PerfviewContrib,
	LifecyclePhAse.ReAdy
);

Registry.As<IEditorInputFActoryRegistry>(Input.EditorInputFActories).registerEditorInputFActory(
	PerfviewInput.Id,
	clAss implements IEditorInputFActory {
		cAnSeriAlize(): booleAn {
			return true;
		}
		seriAlize(): string {
			return '';
		}
		deseriAlize(instAntiAtionService: IInstAntiAtionService): PerfviewInput {
			return instAntiAtionService.creAteInstAnce(PerfviewInput);
		}
	}
);


registerAction2(clAss extends Action2 {

	constructor() {
		super({
			id: 'perfview.show',
			title: { vAlue: locAlize('show.lAbel', "StArtup PerformAnce"), originAl: 'StArtup PerformAnce' },
			cAtegory: CATEGORIES.Developer,
			f1: true
		});
	}

	run(Accessor: ServicesAccessor) {
		const editorService = Accessor.get(IEditorService);
		const instAService = Accessor.get(IInstAntiAtionService);
		return editorService.openEditor(instAService.creAteInstAnce(PerfviewInput));
	}
});
