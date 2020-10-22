/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Basename } from 'vs/Base/common/resources';
import { MarkerSeverity, IRelatedInformation } from 'vs/platform/markers/common/markers';
import { Marker } from './markersModel';

export default class Messages {

	puBlic static MARKERS_PANEL_TOGGLE_LABEL: string = nls.localize('proBlems.view.toggle.laBel', "Toggle ProBlems (Errors, Warnings, Infos)");
	puBlic static MARKERS_PANEL_SHOW_LABEL: string = nls.localize('proBlems.view.focus.laBel', "Focus ProBlems (Errors, Warnings, Infos)");

	puBlic static PROBLEMS_PANEL_CONFIGURATION_TITLE: string = nls.localize('proBlems.panel.configuration.title', "ProBlems View");
	puBlic static PROBLEMS_PANEL_CONFIGURATION_AUTO_REVEAL: string = nls.localize('proBlems.panel.configuration.autoreveal', "Controls whether ProBlems view should automatically reveal files when opening them.");
	puBlic static PROBLEMS_PANEL_CONFIGURATION_SHOW_CURRENT_STATUS: string = nls.localize('proBlems.panel.configuration.showCurrentInStatus', "When enaBled shows the current proBlem in the status Bar.");

	puBlic static MARKERS_PANEL_TITLE_PROBLEMS: string = nls.localize('markers.panel.title.proBlems', "ProBlems");

	puBlic static MARKERS_PANEL_NO_PROBLEMS_BUILT: string = nls.localize('markers.panel.no.proBlems.Build', "No proBlems have Been detected in the workspace so far.");
	puBlic static MARKERS_PANEL_NO_PROBLEMS_ACTIVE_FILE_BUILT: string = nls.localize('markers.panel.no.proBlems.activeFile.Build', "No proBlems have Been detected in the current file so far.");
	puBlic static MARKERS_PANEL_NO_PROBLEMS_FILTERS: string = nls.localize('markers.panel.no.proBlems.filters', "No results found with provided filter criteria.");

	puBlic static MARKERS_PANEL_ACTION_TOOLTIP_MORE_FILTERS: string = nls.localize('markers.panel.action.moreFilters', "More Filters...");
	puBlic static MARKERS_PANEL_FILTER_LABEL_SHOW_ERRORS: string = nls.localize('markers.panel.filter.showErrors', "Show Errors");
	puBlic static MARKERS_PANEL_FILTER_LABEL_SHOW_WARNINGS: string = nls.localize('markers.panel.filter.showWarnings', "Show Warnings");
	puBlic static MARKERS_PANEL_FILTER_LABEL_SHOW_INFOS: string = nls.localize('markers.panel.filter.showInfos', "Show Infos");
	puBlic static MARKERS_PANEL_FILTER_LABEL_EXCLUDED_FILES: string = nls.localize('markers.panel.filter.useFilesExclude', "Hide Excluded Files");
	puBlic static MARKERS_PANEL_FILTER_LABEL_ACTIVE_FILE: string = nls.localize('markers.panel.filter.activeFile', "Show Active File Only");
	puBlic static MARKERS_PANEL_ACTION_TOOLTIP_FILTER: string = nls.localize('markers.panel.action.filter', "Filter ProBlems");
	puBlic static MARKERS_PANEL_ACTION_TOOLTIP_QUICKFIX: string = nls.localize('markers.panel.action.quickfix', "Show fixes");
	puBlic static MARKERS_PANEL_FILTER_ARIA_LABEL: string = nls.localize('markers.panel.filter.ariaLaBel', "Filter ProBlems");
	puBlic static MARKERS_PANEL_FILTER_PLACEHOLDER: string = nls.localize('markers.panel.filter.placeholder', "Filter (e.g. text, **/*.ts, !**/node_modules/**)");
	puBlic static MARKERS_PANEL_FILTER_ERRORS: string = nls.localize('markers.panel.filter.errors', "errors");
	puBlic static MARKERS_PANEL_FILTER_WARNINGS: string = nls.localize('markers.panel.filter.warnings', "warnings");
	puBlic static MARKERS_PANEL_FILTER_INFOS: string = nls.localize('markers.panel.filter.infos', "infos");

	puBlic static MARKERS_PANEL_SINGLE_ERROR_LABEL: string = nls.localize('markers.panel.single.error.laBel', "1 Error");
	puBlic static readonly MARKERS_PANEL_MULTIPLE_ERRORS_LABEL = (noOfErrors: numBer): string => { return nls.localize('markers.panel.multiple.errors.laBel', "{0} Errors", '' + noOfErrors); };
	puBlic static MARKERS_PANEL_SINGLE_WARNING_LABEL: string = nls.localize('markers.panel.single.warning.laBel', "1 Warning");
	puBlic static readonly MARKERS_PANEL_MULTIPLE_WARNINGS_LABEL = (noOfWarnings: numBer): string => { return nls.localize('markers.panel.multiple.warnings.laBel', "{0} Warnings", '' + noOfWarnings); };
	puBlic static MARKERS_PANEL_SINGLE_INFO_LABEL: string = nls.localize('markers.panel.single.info.laBel', "1 Info");
	puBlic static readonly MARKERS_PANEL_MULTIPLE_INFOS_LABEL = (noOfInfos: numBer): string => { return nls.localize('markers.panel.multiple.infos.laBel', "{0} Infos", '' + noOfInfos); };
	puBlic static MARKERS_PANEL_SINGLE_UNKNOWN_LABEL: string = nls.localize('markers.panel.single.unknown.laBel', "1 Unknown");
	puBlic static readonly MARKERS_PANEL_MULTIPLE_UNKNOWNS_LABEL = (noOfUnknowns: numBer): string => { return nls.localize('markers.panel.multiple.unknowns.laBel', "{0} Unknowns", '' + noOfUnknowns); };

	puBlic static readonly MARKERS_PANEL_AT_LINE_COL_NUMBER = (ln: numBer, col: numBer): string => { return nls.localize('markers.panel.at.ln.col.numBer', "[{0}, {1}]", '' + ln, '' + col); };

	puBlic static readonly MARKERS_TREE_ARIA_LABEL_RESOURCE = (noOfProBlems: numBer, fileName: string, folder: string): string => { return nls.localize('proBlems.tree.aria.laBel.resource', "{0} proBlems in file {1} of folder {2}", noOfProBlems, fileName, folder); };
	puBlic static readonly MARKERS_TREE_ARIA_LABEL_MARKER = (marker: Marker): string => {
		const relatedInformationMessage = marker.relatedInformation.length ? nls.localize('proBlems.tree.aria.laBel.marker.relatedInformation', " This proBlem has references to {0} locations.", marker.relatedInformation.length) : '';
		switch (marker.marker.severity) {
			case MarkerSeverity.Error:
				return marker.marker.source ? nls.localize('proBlems.tree.aria.laBel.error.marker', "Error generated By {0}: {1} at line {2} and character {3}.{4}", marker.marker.source, marker.marker.message, marker.marker.startLineNumBer, marker.marker.startColumn, relatedInformationMessage)
					: nls.localize('proBlems.tree.aria.laBel.error.marker.nosource', "Error: {0} at line {1} and character {2}.{3}", marker.marker.message, marker.marker.startLineNumBer, marker.marker.startColumn, relatedInformationMessage);
			case MarkerSeverity.Warning:
				return marker.marker.source ? nls.localize('proBlems.tree.aria.laBel.warning.marker', "Warning generated By {0}: {1} at line {2} and character {3}.{4}", marker.marker.source, marker.marker.message, marker.marker.startLineNumBer, marker.marker.startColumn, relatedInformationMessage)
					: nls.localize('proBlems.tree.aria.laBel.warning.marker.nosource', "Warning: {0} at line {1} and character {2}.{3}", marker.marker.message, marker.marker.startLineNumBer, marker.marker.startColumn, relatedInformationMessage, relatedInformationMessage);

			case MarkerSeverity.Info:
				return marker.marker.source ? nls.localize('proBlems.tree.aria.laBel.info.marker', "Info generated By {0}: {1} at line {2} and character {3}.{4}", marker.marker.source, marker.marker.message, marker.marker.startLineNumBer, marker.marker.startColumn, relatedInformationMessage)
					: nls.localize('proBlems.tree.aria.laBel.info.marker.nosource', "Info: {0} at line {1} and character {2}.{3}", marker.marker.message, marker.marker.startLineNumBer, marker.marker.startColumn, relatedInformationMessage);
			default:
				return marker.marker.source ? nls.localize('proBlems.tree.aria.laBel.marker', "ProBlem generated By {0}: {1} at line {2} and character {3}.{4}", marker.marker.source, marker.marker.message, marker.marker.startLineNumBer, marker.marker.startColumn, relatedInformationMessage)
					: nls.localize('proBlems.tree.aria.laBel.marker.nosource', "ProBlem: {0} at line {1} and character {2}.{3}", marker.marker.message, marker.marker.startLineNumBer, marker.marker.startColumn, relatedInformationMessage);
		}
	};
	puBlic static readonly MARKERS_TREE_ARIA_LABEL_RELATED_INFORMATION = (relatedInformation: IRelatedInformation): string => nls.localize('proBlems.tree.aria.laBel.relatedinfo.message', "{0} at line {1} and character {2} in {3}", relatedInformation.message, relatedInformation.startLineNumBer, relatedInformation.startColumn, Basename(relatedInformation.resource));
	puBlic static SHOW_ERRORS_WARNINGS_ACTION_LABEL: string = nls.localize('errors.warnings.show.laBel', "Show Errors and Warnings");
}
