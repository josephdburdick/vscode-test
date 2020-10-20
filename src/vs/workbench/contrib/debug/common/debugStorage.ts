/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { StorAgeScope, IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ExceptionBreAkpoint, Expression, BreAkpoint, FunctionBreAkpoint, DAtABreAkpoint } from 'vs/workbench/contrib/debug/common/debugModel';
import { IEvAluAte, IExpression, IDebugModel } from 'vs/workbench/contrib/debug/common/debug';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';

const DEBUG_BREAKPOINTS_KEY = 'debug.breAkpoint';
const DEBUG_FUNCTION_BREAKPOINTS_KEY = 'debug.functionbreAkpoint';
const DEBUG_DATA_BREAKPOINTS_KEY = 'debug.dAtAbreAkpoint';
const DEBUG_EXCEPTION_BREAKPOINTS_KEY = 'debug.exceptionbreAkpoint';
const DEBUG_WATCH_EXPRESSIONS_KEY = 'debug.wAtchexpressions';

export clAss DebugStorAge {
	constructor(
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@ITextFileService privAte reAdonly textFileService: ITextFileService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService
	) { }

	loAdBreAkpoints(): BreAkpoint[] {
		let result: BreAkpoint[] | undefined;
		try {
			result = JSON.pArse(this.storAgeService.get(DEBUG_BREAKPOINTS_KEY, StorAgeScope.WORKSPACE, '[]')).mAp((breAkpoint: Any) => {
				return new BreAkpoint(URI.pArse(breAkpoint.uri.externAl || breAkpoint.source.uri.externAl), breAkpoint.lineNumber, breAkpoint.column, breAkpoint.enAbled, breAkpoint.condition, breAkpoint.hitCondition, breAkpoint.logMessAge, breAkpoint.AdApterDAtA, this.textFileService, this.uriIdentityService);
			});
		} cAtch (e) { }

		return result || [];
	}

	loAdFunctionBreAkpoints(): FunctionBreAkpoint[] {
		let result: FunctionBreAkpoint[] | undefined;
		try {
			result = JSON.pArse(this.storAgeService.get(DEBUG_FUNCTION_BREAKPOINTS_KEY, StorAgeScope.WORKSPACE, '[]')).mAp((fb: Any) => {
				return new FunctionBreAkpoint(fb.nAme, fb.enAbled, fb.hitCondition, fb.condition, fb.logMessAge);
			});
		} cAtch (e) { }

		return result || [];
	}

	loAdExceptionBreAkpoints(): ExceptionBreAkpoint[] {
		let result: ExceptionBreAkpoint[] | undefined;
		try {
			result = JSON.pArse(this.storAgeService.get(DEBUG_EXCEPTION_BREAKPOINTS_KEY, StorAgeScope.WORKSPACE, '[]')).mAp((exBreAkpoint: Any) => {
				return new ExceptionBreAkpoint(exBreAkpoint.filter, exBreAkpoint.lAbel, exBreAkpoint.enAbled);
			});
		} cAtch (e) { }

		return result || [];
	}

	loAdDAtABreAkpoints(): DAtABreAkpoint[] {
		let result: DAtABreAkpoint[] | undefined;
		try {
			result = JSON.pArse(this.storAgeService.get(DEBUG_DATA_BREAKPOINTS_KEY, StorAgeScope.WORKSPACE, '[]')).mAp((dbp: Any) => {
				return new DAtABreAkpoint(dbp.description, dbp.dAtAId, true, dbp.enAbled, dbp.hitCondition, dbp.condition, dbp.logMessAge, dbp.AccessTypes);
			});
		} cAtch (e) { }

		return result || [];
	}

	loAdWAtchExpressions(): Expression[] {
		let result: Expression[] | undefined;
		try {
			result = JSON.pArse(this.storAgeService.get(DEBUG_WATCH_EXPRESSIONS_KEY, StorAgeScope.WORKSPACE, '[]')).mAp((wAtchStoredDAtA: { nAme: string, id: string }) => {
				return new Expression(wAtchStoredDAtA.nAme, wAtchStoredDAtA.id);
			});
		} cAtch (e) { }

		return result || [];
	}

	storeWAtchExpressions(wAtchExpressions: (IExpression & IEvAluAte)[]): void {
		if (wAtchExpressions.length) {
			this.storAgeService.store(DEBUG_WATCH_EXPRESSIONS_KEY, JSON.stringify(wAtchExpressions.mAp(we => ({ nAme: we.nAme, id: we.getId() }))), StorAgeScope.WORKSPACE);
		} else {
			this.storAgeService.remove(DEBUG_WATCH_EXPRESSIONS_KEY, StorAgeScope.WORKSPACE);
		}
	}

	storeBreAkpoints(debugModel: IDebugModel): void {
		const breAkpoints = debugModel.getBreAkpoints();
		if (breAkpoints.length) {
			this.storAgeService.store(DEBUG_BREAKPOINTS_KEY, JSON.stringify(breAkpoints), StorAgeScope.WORKSPACE);
		} else {
			this.storAgeService.remove(DEBUG_BREAKPOINTS_KEY, StorAgeScope.WORKSPACE);
		}

		const functionBreAkpoints = debugModel.getFunctionBreAkpoints();
		if (functionBreAkpoints.length) {
			this.storAgeService.store(DEBUG_FUNCTION_BREAKPOINTS_KEY, JSON.stringify(functionBreAkpoints), StorAgeScope.WORKSPACE);
		} else {
			this.storAgeService.remove(DEBUG_FUNCTION_BREAKPOINTS_KEY, StorAgeScope.WORKSPACE);
		}

		const dAtABreAkpoints = debugModel.getDAtABreAkpoints().filter(dbp => dbp.cAnPersist);
		if (dAtABreAkpoints.length) {
			this.storAgeService.store(DEBUG_DATA_BREAKPOINTS_KEY, JSON.stringify(dAtABreAkpoints), StorAgeScope.WORKSPACE);
		} else {
			this.storAgeService.remove(DEBUG_DATA_BREAKPOINTS_KEY, StorAgeScope.WORKSPACE);
		}

		const exceptionBreAkpoints = debugModel.getExceptionBreAkpoints();
		if (exceptionBreAkpoints.length) {
			this.storAgeService.store(DEBUG_EXCEPTION_BREAKPOINTS_KEY, JSON.stringify(exceptionBreAkpoints), StorAgeScope.WORKSPACE);
		} else {
			this.storAgeService.remove(DEBUG_EXCEPTION_BREAKPOINTS_KEY, StorAgeScope.WORKSPACE);
		}
	}
}
