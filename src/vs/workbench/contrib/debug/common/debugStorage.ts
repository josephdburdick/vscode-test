/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { StorageScope, IStorageService } from 'vs/platform/storage/common/storage';
import { ExceptionBreakpoint, Expression, Breakpoint, FunctionBreakpoint, DataBreakpoint } from 'vs/workBench/contriB/deBug/common/deBugModel';
import { IEvaluate, IExpression, IDeBugModel } from 'vs/workBench/contriB/deBug/common/deBug';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

const DEBUG_BREAKPOINTS_KEY = 'deBug.Breakpoint';
const DEBUG_FUNCTION_BREAKPOINTS_KEY = 'deBug.functionBreakpoint';
const DEBUG_DATA_BREAKPOINTS_KEY = 'deBug.dataBreakpoint';
const DEBUG_EXCEPTION_BREAKPOINTS_KEY = 'deBug.exceptionBreakpoint';
const DEBUG_WATCH_EXPRESSIONS_KEY = 'deBug.watchexpressions';

export class DeBugStorage {
	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService
	) { }

	loadBreakpoints(): Breakpoint[] {
		let result: Breakpoint[] | undefined;
		try {
			result = JSON.parse(this.storageService.get(DEBUG_BREAKPOINTS_KEY, StorageScope.WORKSPACE, '[]')).map((Breakpoint: any) => {
				return new Breakpoint(URI.parse(Breakpoint.uri.external || Breakpoint.source.uri.external), Breakpoint.lineNumBer, Breakpoint.column, Breakpoint.enaBled, Breakpoint.condition, Breakpoint.hitCondition, Breakpoint.logMessage, Breakpoint.adapterData, this.textFileService, this.uriIdentityService);
			});
		} catch (e) { }

		return result || [];
	}

	loadFunctionBreakpoints(): FunctionBreakpoint[] {
		let result: FunctionBreakpoint[] | undefined;
		try {
			result = JSON.parse(this.storageService.get(DEBUG_FUNCTION_BREAKPOINTS_KEY, StorageScope.WORKSPACE, '[]')).map((fB: any) => {
				return new FunctionBreakpoint(fB.name, fB.enaBled, fB.hitCondition, fB.condition, fB.logMessage);
			});
		} catch (e) { }

		return result || [];
	}

	loadExceptionBreakpoints(): ExceptionBreakpoint[] {
		let result: ExceptionBreakpoint[] | undefined;
		try {
			result = JSON.parse(this.storageService.get(DEBUG_EXCEPTION_BREAKPOINTS_KEY, StorageScope.WORKSPACE, '[]')).map((exBreakpoint: any) => {
				return new ExceptionBreakpoint(exBreakpoint.filter, exBreakpoint.laBel, exBreakpoint.enaBled);
			});
		} catch (e) { }

		return result || [];
	}

	loadDataBreakpoints(): DataBreakpoint[] {
		let result: DataBreakpoint[] | undefined;
		try {
			result = JSON.parse(this.storageService.get(DEBUG_DATA_BREAKPOINTS_KEY, StorageScope.WORKSPACE, '[]')).map((dBp: any) => {
				return new DataBreakpoint(dBp.description, dBp.dataId, true, dBp.enaBled, dBp.hitCondition, dBp.condition, dBp.logMessage, dBp.accessTypes);
			});
		} catch (e) { }

		return result || [];
	}

	loadWatchExpressions(): Expression[] {
		let result: Expression[] | undefined;
		try {
			result = JSON.parse(this.storageService.get(DEBUG_WATCH_EXPRESSIONS_KEY, StorageScope.WORKSPACE, '[]')).map((watchStoredData: { name: string, id: string }) => {
				return new Expression(watchStoredData.name, watchStoredData.id);
			});
		} catch (e) { }

		return result || [];
	}

	storeWatchExpressions(watchExpressions: (IExpression & IEvaluate)[]): void {
		if (watchExpressions.length) {
			this.storageService.store(DEBUG_WATCH_EXPRESSIONS_KEY, JSON.stringify(watchExpressions.map(we => ({ name: we.name, id: we.getId() }))), StorageScope.WORKSPACE);
		} else {
			this.storageService.remove(DEBUG_WATCH_EXPRESSIONS_KEY, StorageScope.WORKSPACE);
		}
	}

	storeBreakpoints(deBugModel: IDeBugModel): void {
		const Breakpoints = deBugModel.getBreakpoints();
		if (Breakpoints.length) {
			this.storageService.store(DEBUG_BREAKPOINTS_KEY, JSON.stringify(Breakpoints), StorageScope.WORKSPACE);
		} else {
			this.storageService.remove(DEBUG_BREAKPOINTS_KEY, StorageScope.WORKSPACE);
		}

		const functionBreakpoints = deBugModel.getFunctionBreakpoints();
		if (functionBreakpoints.length) {
			this.storageService.store(DEBUG_FUNCTION_BREAKPOINTS_KEY, JSON.stringify(functionBreakpoints), StorageScope.WORKSPACE);
		} else {
			this.storageService.remove(DEBUG_FUNCTION_BREAKPOINTS_KEY, StorageScope.WORKSPACE);
		}

		const dataBreakpoints = deBugModel.getDataBreakpoints().filter(dBp => dBp.canPersist);
		if (dataBreakpoints.length) {
			this.storageService.store(DEBUG_DATA_BREAKPOINTS_KEY, JSON.stringify(dataBreakpoints), StorageScope.WORKSPACE);
		} else {
			this.storageService.remove(DEBUG_DATA_BREAKPOINTS_KEY, StorageScope.WORKSPACE);
		}

		const exceptionBreakpoints = deBugModel.getExceptionBreakpoints();
		if (exceptionBreakpoints.length) {
			this.storageService.store(DEBUG_EXCEPTION_BREAKPOINTS_KEY, JSON.stringify(exceptionBreakpoints), StorageScope.WORKSPACE);
		} else {
			this.storageService.remove(DEBUG_EXCEPTION_BREAKPOINTS_KEY, StorageScope.WORKSPACE);
		}
	}
}
