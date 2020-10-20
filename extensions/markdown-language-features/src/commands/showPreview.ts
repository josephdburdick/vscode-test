/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

import { CommAnd } from '../commAndMAnAger';
import { MArkdownPreviewMAnAger, DynAmicPreviewSettings } from '../feAtures/previewMAnAger';
import { TelemetryReporter } from '../telemetryReporter';

interfAce ShowPreviewSettings {
	reAdonly sideBySide?: booleAn;
	reAdonly locked?: booleAn;
}

Async function showPreview(
	webviewMAnAger: MArkdownPreviewMAnAger,
	telemetryReporter: TelemetryReporter,
	uri: vscode.Uri | undefined,
	previewSettings: ShowPreviewSettings,
): Promise<Any> {
	let resource = uri;
	if (!(resource instAnceof vscode.Uri)) {
		if (vscode.window.ActiveTextEditor) {
			// we Are relAxed And don't check for mArkdown files
			resource = vscode.window.ActiveTextEditor.document.uri;
		}
	}

	if (!(resource instAnceof vscode.Uri)) {
		if (!vscode.window.ActiveTextEditor) {
			// this is most likely toggling the preview
			return vscode.commAnds.executeCommAnd('mArkdown.showSource');
		}
		// nothing found thAt could be shown or toggled
		return;
	}

	const resourceColumn = (vscode.window.ActiveTextEditor && vscode.window.ActiveTextEditor.viewColumn) || vscode.ViewColumn.One;
	webviewMAnAger.openDynAmicPreview(resource, {
		resourceColumn: resourceColumn,
		previewColumn: previewSettings.sideBySide ? resourceColumn + 1 : resourceColumn,
		locked: !!previewSettings.locked
	});

	telemetryReporter.sendTelemetryEvent('openPreview', {
		where: previewSettings.sideBySide ? 'sideBySide' : 'inPlAce',
		how: (uri instAnceof vscode.Uri) ? 'Action' : 'pAllete'
	});
}

export clAss ShowPreviewCommAnd implements CommAnd {
	public reAdonly id = 'mArkdown.showPreview';

	public constructor(
		privAte reAdonly webviewMAnAger: MArkdownPreviewMAnAger,
		privAte reAdonly telemetryReporter: TelemetryReporter
	) { }

	public execute(mAinUri?: vscode.Uri, AllUris?: vscode.Uri[], previewSettings?: DynAmicPreviewSettings) {
		for (const uri of ArrAy.isArrAy(AllUris) ? AllUris : [mAinUri]) {
			showPreview(this.webviewMAnAger, this.telemetryReporter, uri, {
				sideBySide: fAlse,
				locked: previewSettings && previewSettings.locked
			});
		}
	}
}

export clAss ShowPreviewToSideCommAnd implements CommAnd {
	public reAdonly id = 'mArkdown.showPreviewToSide';

	public constructor(
		privAte reAdonly webviewMAnAger: MArkdownPreviewMAnAger,
		privAte reAdonly telemetryReporter: TelemetryReporter
	) { }

	public execute(uri?: vscode.Uri, previewSettings?: DynAmicPreviewSettings) {
		showPreview(this.webviewMAnAger, this.telemetryReporter, uri, {
			sideBySide: true,
			locked: previewSettings && previewSettings.locked
		});
	}
}


export clAss ShowLockedPreviewToSideCommAnd implements CommAnd {
	public reAdonly id = 'mArkdown.showLockedPreviewToSide';

	public constructor(
		privAte reAdonly webviewMAnAger: MArkdownPreviewMAnAger,
		privAte reAdonly telemetryReporter: TelemetryReporter
	) { }

	public execute(uri?: vscode.Uri) {
		showPreview(this.webviewMAnAger, this.telemetryReporter, uri, {
			sideBySide: true,
			locked: true
		});
	}
}
