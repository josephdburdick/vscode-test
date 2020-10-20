/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/


/** DeclArAtion module describing the VS Code debug protocol.
	Auto-generAted from json schemA. Do not edit mAnuAlly.
*/
declAre module DebugProtocol {

	/** BAse clAss of requests, responses, And events. */
	export interfAce ProtocolMessAge {
		/** Sequence number (Also known As messAge ID). For protocol messAges of type 'request' this ID cAn be used to cAncel the request. */
		seq: number;
		/** MessAge type.
			VAlues: 'request', 'response', 'event', etc.
		*/
		type: string;
	}

	/** A client or debug AdApter initiAted request. */
	export interfAce Request extends ProtocolMessAge {
		// type: 'request';
		/** The commAnd to execute. */
		commAnd: string;
		/** Object contAining Arguments for the commAnd. */
		Arguments?: Any;
	}

	/** A debug AdApter initiAted event. */
	export interfAce Event extends ProtocolMessAge {
		// type: 'event';
		/** Type of event. */
		event: string;
		/** Event-specific informAtion. */
		body?: Any;
	}

	/** Response for A request. */
	export interfAce Response extends ProtocolMessAge {
		// type: 'response';
		/** Sequence number of the corresponding request. */
		request_seq: number;
		/** Outcome of the request.
			If true, the request wAs successful And the 'body' Attribute mAy contAin the result of the request.
			If the vAlue is fAlse, the Attribute 'messAge' contAins the error in short form And the 'body' mAy contAin AdditionAl informAtion (see 'ErrorResponse.body.error').
		*/
		success: booleAn;
		/** The commAnd requested. */
		commAnd: string;
		/** ContAins the rAw error in short form if 'success' is fAlse.
			This rAw error might be interpreted by the frontend And is not shown in the UI.
			Some predefined vAlues exist.
			VAlues:
			'cAncelled': request wAs cAncelled.
			etc.
		*/
		messAge?: string;
		/** ContAins request result if success is true And optionAl error detAils if success is fAlse. */
		body?: Any;
	}

	/** On error (whenever 'success' is fAlse), the body cAn provide more detAils. */
	export interfAce ErrorResponse extends Response {
		body: {
			/** An optionAl, structured error messAge. */
			error?: MessAge;
		};
	}

	/** CAncel request; vAlue of commAnd field is 'cAncel'.
		The 'cAncel' request is used by the frontend in two situAtions:
		- to indicAte thAt it is no longer interested in the result produced by A specific request issued eArlier
		- to cAncel A progress sequence. Clients should only cAll this request if the cApAbility 'supportsCAncelRequest' is true.
		This request hAs A hint chArActeristic: A debug AdApter cAn only be expected to mAke A 'best effort' in honouring this request but there Are no guArAntees.
		The 'cAncel' request mAy return An error if it could not cAncel An operAtion but A frontend should refrAin from presenting this error to end users.
		A frontend client should only cAll this request if the cApAbility 'supportsCAncelRequest' is true.
		The request thAt got cAnceled still needs to send A response bAck. This cAn either be A normAl result ('success' Attribute true)
		or An error response ('success' Attribute fAlse And the 'messAge' set to 'cAncelled').
		Returning pArtiAl results from A cAncelled request is possible but pleAse note thAt A frontend client hAs no generic wAy for detecting thAt A response is pArtiAl or not.
		 The progress thAt got cAncelled still needs to send A 'progressEnd' event bAck.
		 A client should not Assume thAt progress just got cAncelled After sending the 'cAncel' request.
	*/
	export interfAce CAncelRequest extends Request {
		// commAnd: 'cAncel';
		Arguments?: CAncelArguments;
	}

	/** Arguments for 'cAncel' request. */
	export interfAce CAncelArguments {
		/** The ID (Attribute 'seq') of the request to cAncel. If missing no request is cAncelled.
			Both A 'requestId' And A 'progressId' cAn be specified in one request.
		*/
		requestId?: number;
		/** The ID (Attribute 'progressId') of the progress to cAncel. If missing no progress is cAncelled.
			Both A 'requestId' And A 'progressId' cAn be specified in one request.
		*/
		progressId?: string;
	}

	/** Response to 'cAncel' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce CAncelResponse extends Response {
	}

	/** Event messAge for 'initiAlized' event type.
		This event indicAtes thAt the debug AdApter is reAdy to Accept configurAtion requests (e.g. SetBreAkpointsRequest, SetExceptionBreAkpointsRequest).
		A debug AdApter is expected to send this event when it is reAdy to Accept configurAtion requests (but not before the 'initiAlize' request hAs finished).
		The sequence of events/requests is As follows:
		- AdApters sends 'initiAlized' event (After the 'initiAlize' request hAs returned)
		- frontend sends zero or more 'setBreAkpoints' requests
		- frontend sends one 'setFunctionBreAkpoints' request (if cApAbility 'supportsFunctionBreAkpoints' is true)
		- frontend sends A 'setExceptionBreAkpoints' request if one or more 'exceptionBreAkpointFilters' hAve been defined (or if 'supportsConfigurAtionDoneRequest' is not defined or fAlse)
		- frontend sends other future configurAtion requests
		- frontend sends one 'configurAtionDone' request to indicAte the end of the configurAtion.
	*/
	export interfAce InitiAlizedEvent extends Event {
		// event: 'initiAlized';
	}

	/** Event messAge for 'stopped' event type.
		The event indicAtes thAt the execution of the debuggee hAs stopped due to some condition.
		This cAn be cAused by A breAk point previously set, A stepping request hAs completed, by executing A debugger stAtement etc.
	*/
	export interfAce StoppedEvent extends Event {
		// event: 'stopped';
		body: {
			/** The reAson for the event.
				For bAckwArd compAtibility this string is shown in the UI if the 'description' Attribute is missing (but it must not be trAnslAted).
				VAlues: 'step', 'breAkpoint', 'exception', 'pAuse', 'entry', 'goto', 'function breAkpoint', 'dAtA breAkpoint', 'instruction breAkpoint', etc.
			*/
			reAson: string;
			/** The full reAson for the event, e.g. 'PAused on exception'. This string is shown in the UI As is And must be trAnslAted. */
			description?: string;
			/** The threAd which wAs stopped. */
			threAdId?: number;
			/** A vAlue of true hints to the frontend thAt this event should not chAnge the focus. */
			preserveFocusHint?: booleAn;
			/** AdditionAl informAtion. E.g. if reAson is 'exception', text contAins the exception nAme. This string is shown in the UI. */
			text?: string;
			/** If 'AllThreAdsStopped' is true, A debug AdApter cAn Announce thAt All threAds hAve stopped.
				- The client should use this informAtion to enAble thAt All threAds cAn be expAnded to Access their stAcktrAces.
				- If the Attribute is missing or fAlse, only the threAd with the given threAdId cAn be expAnded.
			*/
			AllThreAdsStopped?: booleAn;
		};
	}

	/** Event messAge for 'continued' event type.
		The event indicAtes thAt the execution of the debuggee hAs continued.
		PleAse note: A debug AdApter is not expected to send this event in response to A request thAt implies thAt execution continues, e.g. 'lAunch' or 'continue'.
		It is only necessAry to send A 'continued' event if there wAs no previous request thAt implied this.
	*/
	export interfAce ContinuedEvent extends Event {
		// event: 'continued';
		body: {
			/** The threAd which wAs continued. */
			threAdId: number;
			/** If 'AllThreAdsContinued' is true, A debug AdApter cAn Announce thAt All threAds hAve continued. */
			AllThreAdsContinued?: booleAn;
		};
	}

	/** Event messAge for 'exited' event type.
		The event indicAtes thAt the debuggee hAs exited And returns its exit code.
	*/
	export interfAce ExitedEvent extends Event {
		// event: 'exited';
		body: {
			/** The exit code returned from the debuggee. */
			exitCode: number;
		};
	}

	/** Event messAge for 'terminAted' event type.
		The event indicAtes thAt debugging of the debuggee hAs terminAted. This does **not** meAn thAt the debuggee itself hAs exited.
	*/
	export interfAce TerminAtedEvent extends Event {
		// event: 'terminAted';
		body?: {
			/** A debug AdApter mAy set 'restArt' to true (or to An ArbitrAry object) to request thAt the front end restArts the session.
				The vAlue is not interpreted by the client And pAssed unmodified As An Attribute '__restArt' to the 'lAunch' And 'AttAch' requests.
			*/
			restArt?: Any;
		};
	}

	/** Event messAge for 'threAd' event type.
		The event indicAtes thAt A threAd hAs stArted or exited.
	*/
	export interfAce ThreAdEvent extends Event {
		// event: 'threAd';
		body: {
			/** The reAson for the event.
				VAlues: 'stArted', 'exited', etc.
			*/
			reAson: string;
			/** The identifier of the threAd. */
			threAdId: number;
		};
	}

	/** Event messAge for 'output' event type.
		The event indicAtes thAt the tArget hAs produced some output.
	*/
	export interfAce OutputEvent extends Event {
		// event: 'output';
		body: {
			/** The output cAtegory. If not specified, 'console' is Assumed.
				VAlues: 'console', 'stdout', 'stderr', 'telemetry', etc.
			*/
			cAtegory?: string;
			/** The output to report. */
			output: string;
			/** Support for keeping An output log orgAnized by grouping relAted messAges.
				'stArt': StArt A new group in expAnded mode. Subsequent output events Are members of the group And should be shown indented.
				The 'output' Attribute becomes the nAme of the group And is not indented.
				'stArtCollApsed': StArt A new group in collApsed mode. Subsequent output events Are members of the group And should be shown indented (As soon As the group is expAnded).
				The 'output' Attribute becomes the nAme of the group And is not indented.
				'end': End the current group And decreAses the indentAtion of subsequent output events.
				A non empty 'output' Attribute is shown As the unindented end of the group.
			*/
			group?: 'stArt' | 'stArtCollApsed' | 'end';
			/** If An Attribute 'vAriAblesReference' exists And its vAlue is > 0, the output contAins objects which cAn be retrieved by pAssing 'vAriAblesReference' to the 'vAriAbles' request. The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1). */
			vAriAblesReference?: number;
			/** An optionAl source locAtion where the output wAs produced. */
			source?: Source;
			/** An optionAl source locAtion line where the output wAs produced. */
			line?: number;
			/** An optionAl source locAtion column where the output wAs produced. */
			column?: number;
			/** OptionAl dAtA to report. For the 'telemetry' cAtegory the dAtA will be sent to telemetry, for the other cAtegories the dAtA is shown in JSON formAt. */
			dAtA?: Any;
		};
	}

	/** Event messAge for 'breAkpoint' event type.
		The event indicAtes thAt some informAtion About A breAkpoint hAs chAnged.
	*/
	export interfAce BreAkpointEvent extends Event {
		// event: 'breAkpoint';
		body: {
			/** The reAson for the event.
				VAlues: 'chAnged', 'new', 'removed', etc.
			*/
			reAson: string;
			/** The 'id' Attribute is used to find the tArget breAkpoint And the other Attributes Are used As the new vAlues. */
			breAkpoint: BreAkpoint;
		};
	}

	/** Event messAge for 'module' event type.
		The event indicAtes thAt some informAtion About A module hAs chAnged.
	*/
	export interfAce ModuleEvent extends Event {
		// event: 'module';
		body: {
			/** The reAson for the event. */
			reAson: 'new' | 'chAnged' | 'removed';
			/** The new, chAnged, or removed module. In cAse of 'removed' only the module id is used. */
			module: Module;
		};
	}

	/** Event messAge for 'loAdedSource' event type.
		The event indicAtes thAt some source hAs been Added, chAnged, or removed from the set of All loAded sources.
	*/
	export interfAce LoAdedSourceEvent extends Event {
		// event: 'loAdedSource';
		body: {
			/** The reAson for the event. */
			reAson: 'new' | 'chAnged' | 'removed';
			/** The new, chAnged, or removed source. */
			source: Source;
		};
	}

	/** Event messAge for 'process' event type.
		The event indicAtes thAt the debugger hAs begun debugging A new process. Either one thAt it hAs lAunched, or one thAt it hAs AttAched to.
	*/
	export interfAce ProcessEvent extends Event {
		// event: 'process';
		body: {
			/** The logicAl nAme of the process. This is usuAlly the full pAth to process's executAble file. ExAmple: /home/exAmple/myproj/progrAm.js. */
			nAme: string;
			/** The system process id of the debugged process. This property will be missing for non-system processes. */
			systemProcessId?: number;
			/** If true, the process is running on the sAme computer As the debug AdApter. */
			isLocAlProcess?: booleAn;
			/** Describes how the debug engine stArted debugging this process.
				'lAunch': Process wAs lAunched under the debugger.
				'AttAch': Debugger AttAched to An existing process.
				'AttAchForSuspendedLAunch': A project lAuncher component hAs lAunched A new process in A suspended stAte And then Asked the debugger to AttAch.
			*/
			stArtMethod?: 'lAunch' | 'AttAch' | 'AttAchForSuspendedLAunch';
			/** The size of A pointer or Address for this process, in bits. This vAlue mAy be used by clients when formAtting Addresses for displAy. */
			pointerSize?: number;
		};
	}

	/** Event messAge for 'cApAbilities' event type.
		The event indicAtes thAt one or more cApAbilities hAve chAnged.
		Since the cApAbilities Are dependent on the frontend And its UI, it might not be possible to chAnge thAt At rAndom times (or too lAte).
		Consequently this event hAs A hint chArActeristic: A frontend cAn only be expected to mAke A 'best effort' in honouring individuAl cApAbilities but there Are no guArAntees.
		Only chAnged cApAbilities need to be included, All other cApAbilities keep their vAlues.
	*/
	export interfAce CApAbilitiesEvent extends Event {
		// event: 'cApAbilities';
		body: {
			/** The set of updAted cApAbilities. */
			cApAbilities: CApAbilities;
		};
	}

	/** Event messAge for 'progressStArt' event type.
		The event signAls thAt A long running operAtion is About to stArt And
		provides AdditionAl informAtion for the client to set up A corresponding progress And cAncellAtion UI.
		The client is free to delAy the showing of the UI in order to reduce flicker.
		This event should only be sent if the client hAs pAssed the vAlue true for the 'supportsProgressReporting' cApAbility of the 'initiAlize' request.
	*/
	export interfAce ProgressStArtEvent extends Event {
		// event: 'progressStArt';
		body: {
			/** An ID thAt must be used in subsequent 'progressUpdAte' And 'progressEnd' events to mAke them refer to the sAme progress reporting.
				IDs must be unique within A debug session.
			*/
			progressId: string;
			/** MAndAtory (short) title of the progress reporting. Shown in the UI to describe the long running operAtion. */
			title: string;
			/** The request ID thAt this progress report is relAted to. If specified A debug AdApter is expected to emit
				progress events for the long running request until the request hAs been either completed or cAncelled.
				If the request ID is omitted, the progress report is Assumed to be relAted to some generAl Activity of the debug AdApter.
			*/
			requestId?: number;
			/** If true, the request thAt reports progress mAy be cAnceled with A 'cAncel' request.
				So this property bAsicAlly controls whether the client should use UX thAt supports cAncellAtion.
				Clients thAt don't support cAncellAtion Are Allowed to ignore the setting.
			*/
			cAncellAble?: booleAn;
			/** OptionAl, more detAiled progress messAge. */
			messAge?: string;
			/** OptionAl progress percentAge to displAy (vAlue rAnge: 0 to 100). If omitted no percentAge will be shown. */
			percentAge?: number;
		};
	}

	/** Event messAge for 'progressUpdAte' event type.
		The event signAls thAt the progress reporting needs to updAted with A new messAge And/or percentAge.
		The client does not hAve to updAte the UI immediAtely, but the clients needs to keep trAck of the messAge And/or percentAge vAlues.
		This event should only be sent if the client hAs pAssed the vAlue true for the 'supportsProgressReporting' cApAbility of the 'initiAlize' request.
	*/
	export interfAce ProgressUpdAteEvent extends Event {
		// event: 'progressUpdAte';
		body: {
			/** The ID thAt wAs introduced in the initiAl 'progressStArt' event. */
			progressId: string;
			/** OptionAl, more detAiled progress messAge. If omitted, the previous messAge (if Any) is used. */
			messAge?: string;
			/** OptionAl progress percentAge to displAy (vAlue rAnge: 0 to 100). If omitted no percentAge will be shown. */
			percentAge?: number;
		};
	}

	/** Event messAge for 'progressEnd' event type.
		The event signAls the end of the progress reporting with An optionAl finAl messAge.
		This event should only be sent if the client hAs pAssed the vAlue true for the 'supportsProgressReporting' cApAbility of the 'initiAlize' request.
	*/
	export interfAce ProgressEndEvent extends Event {
		// event: 'progressEnd';
		body: {
			/** The ID thAt wAs introduced in the initiAl 'ProgressStArtEvent'. */
			progressId: string;
			/** OptionAl, more detAiled progress messAge. If omitted, the previous messAge (if Any) is used. */
			messAge?: string;
		};
	}

	/** Event messAge for 'invAlidAted' event type.
		This event signAls thAt some stAte in the debug AdApter hAs chAnged And requires thAt the client needs to re-render the dAtA snApshot previously requested.
		Debug AdApters do not hAve to emit this event for runtime chAnges like stopped or threAd events becAuse in thAt cAse the client refetches the new stAte AnywAy. But the event cAn be used for exAmple to refresh the UI After rendering formAtting hAs chAnged in the debug AdApter.
		This event should only be sent if the debug AdApter hAs received A vAlue true for the 'supportsInvAlidAtedEvent' cApAbility of the 'initiAlize' request.
	*/
	export interfAce InvAlidAtedEvent extends Event {
		// event: 'invAlidAted';
		body: {
			/** OptionAl set of logicAl AreAs thAt got invAlidAted. If this property is missing or empty, A single vAlue 'All' is Assumed. */
			AreAs?: InvAlidAtedAreAs[];
			/** If specified, the client only needs to refetch dAtA relAted to this threAd. */
			threAdId?: number;
			/** If specified, the client only needs to refetch dAtA relAted to this stAck frAme (And the 'threAdId' is ignored). */
			stAckFrAmeId?: number;
		};
	}

	/** RunInTerminAl request; vAlue of commAnd field is 'runInTerminAl'.
		This optionAl request is sent from the debug AdApter to the client to run A commAnd in A terminAl.
		This is typicAlly used to lAunch the debuggee in A terminAl provided by the client.
		This request should only be cAlled if the client hAs pAssed the vAlue true for the 'supportsRunInTerminAlRequest' cApAbility of the 'initiAlize' request.
	*/
	export interfAce RunInTerminAlRequest extends Request {
		// commAnd: 'runInTerminAl';
		Arguments: RunInTerminAlRequestArguments;
	}

	/** Arguments for 'runInTerminAl' request. */
	export interfAce RunInTerminAlRequestArguments {
		/** WhAt kind of terminAl to lAunch. */
		kind?: 'integrAted' | 'externAl';
		/** OptionAl title of the terminAl. */
		title?: string;
		/** Working directory of the commAnd. */
		cwd: string;
		/** List of Arguments. The first Argument is the commAnd to run. */
		Args: string[];
		/** Environment key-vAlue pAirs thAt Are Added to or removed from the defAult environment. */
		env?: { [key: string]: string | null; };
	}

	/** Response to 'runInTerminAl' request. */
	export interfAce RunInTerminAlResponse extends Response {
		body: {
			/** The process ID. The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1). */
			processId?: number;
			/** The process ID of the terminAl shell. The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1). */
			shellProcessId?: number;
		};
	}

	/** InitiAlize request; vAlue of commAnd field is 'initiAlize'.
		The 'initiAlize' request is sent As the first request from the client to the debug AdApter
		in order to configure it with client cApAbilities And to retrieve cApAbilities from the debug AdApter.
		Until the debug AdApter hAs responded to with An 'initiAlize' response, the client must not send Any AdditionAl requests or events to the debug AdApter.
		In Addition the debug AdApter is not Allowed to send Any requests or events to the client until it hAs responded with An 'initiAlize' response.
		The 'initiAlize' request mAy only be sent once.
	*/
	export interfAce InitiAlizeRequest extends Request {
		// commAnd: 'initiAlize';
		Arguments: InitiAlizeRequestArguments;
	}

	/** Arguments for 'initiAlize' request. */
	export interfAce InitiAlizeRequestArguments {
		/** The ID of the (frontend) client using this AdApter. */
		clientID?: string;
		/** The humAn reAdAble nAme of the (frontend) client using this AdApter. */
		clientNAme?: string;
		/** The ID of the debug AdApter. */
		AdApterID: string;
		/** The ISO-639 locAle of the (frontend) client using this AdApter, e.g. en-US or de-CH. */
		locAle?: string;
		/** If true All line numbers Are 1-bAsed (defAult). */
		linesStArtAt1?: booleAn;
		/** If true All column numbers Are 1-bAsed (defAult). */
		columnsStArtAt1?: booleAn;
		/** Determines in whAt formAt pAths Are specified. The defAult is 'pAth', which is the nAtive formAt.
			VAlues: 'pAth', 'uri', etc.
		*/
		pAthFormAt?: string;
		/** Client supports the optionAl type Attribute for vAriAbles. */
		supportsVAriAbleType?: booleAn;
		/** Client supports the pAging of vAriAbles. */
		supportsVAriAblePAging?: booleAn;
		/** Client supports the runInTerminAl request. */
		supportsRunInTerminAlRequest?: booleAn;
		/** Client supports memory references. */
		supportsMemoryReferences?: booleAn;
		/** Client supports progress reporting. */
		supportsProgressReporting?: booleAn;
		/** Client supports the invAlidAted event. */
		supportsInvAlidAtedEvent?: booleAn;
	}

	/** Response to 'initiAlize' request. */
	export interfAce InitiAlizeResponse extends Response {
		/** The cApAbilities of this debug AdApter. */
		body?: CApAbilities;
	}

	/** ConfigurAtionDone request; vAlue of commAnd field is 'configurAtionDone'.
		This optionAl request indicAtes thAt the client hAs finished initiAlizAtion of the debug AdApter.
		So it is the lAst request in the sequence of configurAtion requests (which wAs stArted by the 'initiAlized' event).
		Clients should only cAll this request if the cApAbility 'supportsConfigurAtionDoneRequest' is true.
	*/
	export interfAce ConfigurAtionDoneRequest extends Request {
		// commAnd: 'configurAtionDone';
		Arguments?: ConfigurAtionDoneArguments;
	}

	/** Arguments for 'configurAtionDone' request. */
	export interfAce ConfigurAtionDoneArguments {
	}

	/** Response to 'configurAtionDone' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce ConfigurAtionDoneResponse extends Response {
	}

	/** LAunch request; vAlue of commAnd field is 'lAunch'.
		This lAunch request is sent from the client to the debug AdApter to stArt the debuggee with or without debugging (if 'noDebug' is true).
		Since lAunching is debugger/runtime specific, the Arguments for this request Are not pArt of this specificAtion.
	*/
	export interfAce LAunchRequest extends Request {
		// commAnd: 'lAunch';
		Arguments: LAunchRequestArguments;
	}

	/** Arguments for 'lAunch' request. AdditionAl Attributes Are implementAtion specific. */
	export interfAce LAunchRequestArguments {
		/** If noDebug is true the lAunch request should lAunch the progrAm without enAbling debugging. */
		noDebug?: booleAn;
		/** OptionAl dAtA from the previous, restArted session.
			The dAtA is sent As the 'restArt' Attribute of the 'terminAted' event.
			The client should leAve the dAtA intAct.
		*/
		__restArt?: Any;
	}

	/** Response to 'lAunch' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce LAunchResponse extends Response {
	}

	/** AttAch request; vAlue of commAnd field is 'AttAch'.
		The AttAch request is sent from the client to the debug AdApter to AttAch to A debuggee thAt is AlreAdy running.
		Since AttAching is debugger/runtime specific, the Arguments for this request Are not pArt of this specificAtion.
	*/
	export interfAce AttAchRequest extends Request {
		// commAnd: 'AttAch';
		Arguments: AttAchRequestArguments;
	}

	/** Arguments for 'AttAch' request. AdditionAl Attributes Are implementAtion specific. */
	export interfAce AttAchRequestArguments {
		/** OptionAl dAtA from the previous, restArted session.
			The dAtA is sent As the 'restArt' Attribute of the 'terminAted' event.
			The client should leAve the dAtA intAct.
		*/
		__restArt?: Any;
	}

	/** Response to 'AttAch' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce AttAchResponse extends Response {
	}

	/** RestArt request; vAlue of commAnd field is 'restArt'.
		RestArts A debug session. Clients should only cAll this request if the cApAbility 'supportsRestArtRequest' is true.
		If the cApAbility is missing or hAs the vAlue fAlse, A typicAl client will emulAte 'restArt' by terminAting the debug AdApter first And then lAunching it Anew.
	*/
	export interfAce RestArtRequest extends Request {
		// commAnd: 'restArt';
		Arguments?: RestArtArguments;
	}

	/** Arguments for 'restArt' request. */
	export interfAce RestArtArguments {
	}

	/** Response to 'restArt' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce RestArtResponse extends Response {
	}

	/** Disconnect request; vAlue of commAnd field is 'disconnect'.
		The 'disconnect' request is sent from the client to the debug AdApter in order to stop debugging.
		It Asks the debug AdApter to disconnect from the debuggee And to terminAte the debug AdApter.
		If the debuggee hAs been stArted with the 'lAunch' request, the 'disconnect' request terminAtes the debuggee.
		If the 'AttAch' request wAs used to connect to the debuggee, 'disconnect' does not terminAte the debuggee.
		This behAvior cAn be controlled with the 'terminAteDebuggee' Argument (if supported by the debug AdApter).
	*/
	export interfAce DisconnectRequest extends Request {
		// commAnd: 'disconnect';
		Arguments?: DisconnectArguments;
	}

	/** Arguments for 'disconnect' request. */
	export interfAce DisconnectArguments {
		/** A vAlue of true indicAtes thAt this 'disconnect' request is pArt of A restArt sequence. */
		restArt?: booleAn;
		/** IndicAtes whether the debuggee should be terminAted when the debugger is disconnected.
			If unspecified, the debug AdApter is free to do whAtever it thinks is best.
			The Attribute is only honored by A debug AdApter if the cApAbility 'supportTerminAteDebuggee' is true.
		*/
		terminAteDebuggee?: booleAn;
	}

	/** Response to 'disconnect' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce DisconnectResponse extends Response {
	}

	/** TerminAte request; vAlue of commAnd field is 'terminAte'.
		The 'terminAte' request is sent from the client to the debug AdApter in order to give the debuggee A chAnce for terminAting itself.
		Clients should only cAll this request if the cApAbility 'supportsTerminAteRequest' is true.
	*/
	export interfAce TerminAteRequest extends Request {
		// commAnd: 'terminAte';
		Arguments?: TerminAteArguments;
	}

	/** Arguments for 'terminAte' request. */
	export interfAce TerminAteArguments {
		/** A vAlue of true indicAtes thAt this 'terminAte' request is pArt of A restArt sequence. */
		restArt?: booleAn;
	}

	/** Response to 'terminAte' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce TerminAteResponse extends Response {
	}

	/** BreAkpointLocAtions request; vAlue of commAnd field is 'breAkpointLocAtions'.
		The 'breAkpointLocAtions' request returns All possible locAtions for source breAkpoints in A given rAnge.
		Clients should only cAll this request if the cApAbility 'supportsBreAkpointLocAtionsRequest' is true.
	*/
	export interfAce BreAkpointLocAtionsRequest extends Request {
		// commAnd: 'breAkpointLocAtions';
		Arguments?: BreAkpointLocAtionsArguments;
	}

	/** Arguments for 'breAkpointLocAtions' request. */
	export interfAce BreAkpointLocAtionsArguments {
		/** The source locAtion of the breAkpoints; either 'source.pAth' or 'source.reference' must be specified. */
		source: Source;
		/** StArt line of rAnge to seArch possible breAkpoint locAtions in. If only the line is specified, the request returns All possible locAtions in thAt line. */
		line: number;
		/** OptionAl stArt column of rAnge to seArch possible breAkpoint locAtions in. If no stArt column is given, the first column in the stArt line is Assumed. */
		column?: number;
		/** OptionAl end line of rAnge to seArch possible breAkpoint locAtions in. If no end line is given, then the end line is Assumed to be the stArt line. */
		endLine?: number;
		/** OptionAl end column of rAnge to seArch possible breAkpoint locAtions in. If no end column is given, then it is Assumed to be in the lAst column of the end line. */
		endColumn?: number;
	}

	/** Response to 'breAkpointLocAtions' request.
		ContAins possible locAtions for source breAkpoints.
	*/
	export interfAce BreAkpointLocAtionsResponse extends Response {
		body: {
			/** Sorted set of possible breAkpoint locAtions. */
			breAkpoints: BreAkpointLocAtion[];
		};
	}

	/** SetBreAkpoints request; vAlue of commAnd field is 'setBreAkpoints'.
		Sets multiple breAkpoints for A single source And cleArs All previous breAkpoints in thAt source.
		To cleAr All breAkpoint for A source, specify An empty ArrAy.
		When A breAkpoint is hit, A 'stopped' event (with reAson 'breAkpoint') is generAted.
	*/
	export interfAce SetBreAkpointsRequest extends Request {
		// commAnd: 'setBreAkpoints';
		Arguments: SetBreAkpointsArguments;
	}

	/** Arguments for 'setBreAkpoints' request. */
	export interfAce SetBreAkpointsArguments {
		/** The source locAtion of the breAkpoints; either 'source.pAth' or 'source.reference' must be specified. */
		source: Source;
		/** The code locAtions of the breAkpoints. */
		breAkpoints?: SourceBreAkpoint[];
		/** DeprecAted: The code locAtions of the breAkpoints. */
		lines?: number[];
		/** A vAlue of true indicAtes thAt the underlying source hAs been modified which results in new breAkpoint locAtions. */
		sourceModified?: booleAn;
	}

	/** Response to 'setBreAkpoints' request.
		Returned is informAtion About eAch breAkpoint creAted by this request.
		This includes the ActuAl code locAtion And whether the breAkpoint could be verified.
		The breAkpoints returned Are in the sAme order As the elements of the 'breAkpoints'
		(or the deprecAted 'lines') ArrAy in the Arguments.
	*/
	export interfAce SetBreAkpointsResponse extends Response {
		body: {
			/** InformAtion About the breAkpoints.
				The ArrAy elements Are in the sAme order As the elements of the 'breAkpoints' (or the deprecAted 'lines') ArrAy in the Arguments.
			*/
			breAkpoints: BreAkpoint[];
		};
	}

	/** SetFunctionBreAkpoints request; vAlue of commAnd field is 'setFunctionBreAkpoints'.
		ReplAces All existing function breAkpoints with new function breAkpoints.
		To cleAr All function breAkpoints, specify An empty ArrAy.
		When A function breAkpoint is hit, A 'stopped' event (with reAson 'function breAkpoint') is generAted.
		Clients should only cAll this request if the cApAbility 'supportsFunctionBreAkpoints' is true.
	*/
	export interfAce SetFunctionBreAkpointsRequest extends Request {
		// commAnd: 'setFunctionBreAkpoints';
		Arguments: SetFunctionBreAkpointsArguments;
	}

	/** Arguments for 'setFunctionBreAkpoints' request. */
	export interfAce SetFunctionBreAkpointsArguments {
		/** The function nAmes of the breAkpoints. */
		breAkpoints: FunctionBreAkpoint[];
	}

	/** Response to 'setFunctionBreAkpoints' request.
		Returned is informAtion About eAch breAkpoint creAted by this request.
	*/
	export interfAce SetFunctionBreAkpointsResponse extends Response {
		body: {
			/** InformAtion About the breAkpoints. The ArrAy elements correspond to the elements of the 'breAkpoints' ArrAy. */
			breAkpoints: BreAkpoint[];
		};
	}

	/** SetExceptionBreAkpoints request; vAlue of commAnd field is 'setExceptionBreAkpoints'.
		The request configures the debuggers response to thrown exceptions.
		If An exception is configured to breAk, A 'stopped' event is fired (with reAson 'exception').
		Clients should only cAll this request if the cApAbility 'exceptionBreAkpointFilters' returns one or more filters.
	*/
	export interfAce SetExceptionBreAkpointsRequest extends Request {
		// commAnd: 'setExceptionBreAkpoints';
		Arguments: SetExceptionBreAkpointsArguments;
	}

	/** Arguments for 'setExceptionBreAkpoints' request. */
	export interfAce SetExceptionBreAkpointsArguments {
		/** IDs of checked exception options. The set of IDs is returned viA the 'exceptionBreAkpointFilters' cApAbility. */
		filters: string[];
		/** ConfigurAtion options for selected exceptions.
			The Attribute is only honored by A debug AdApter if the cApAbility 'supportsExceptionOptions' is true.
		*/
		exceptionOptions?: ExceptionOptions[];
	}

	/** Response to 'setExceptionBreAkpoints' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce SetExceptionBreAkpointsResponse extends Response {
	}

	/** DAtABreAkpointInfo request; vAlue of commAnd field is 'dAtABreAkpointInfo'.
		ObtAins informAtion on A possible dAtA breAkpoint thAt could be set on An expression or vAriAble.
		Clients should only cAll this request if the cApAbility 'supportsDAtABreAkpoints' is true.
	*/
	export interfAce DAtABreAkpointInfoRequest extends Request {
		// commAnd: 'dAtABreAkpointInfo';
		Arguments: DAtABreAkpointInfoArguments;
	}

	/** Arguments for 'dAtABreAkpointInfo' request. */
	export interfAce DAtABreAkpointInfoArguments {
		/** Reference to the VAriAble contAiner if the dAtA breAkpoint is requested for A child of the contAiner. */
		vAriAblesReference?: number;
		/** The nAme of the VAriAble's child to obtAin dAtA breAkpoint informAtion for.
			If vAriAbleReference isn’t provided, this cAn be An expression.
		*/
		nAme: string;
	}

	/** Response to 'dAtABreAkpointInfo' request. */
	export interfAce DAtABreAkpointInfoResponse extends Response {
		body: {
			/** An identifier for the dAtA on which A dAtA breAkpoint cAn be registered with the setDAtABreAkpoints request or null if no dAtA breAkpoint is AvAilAble. */
			dAtAId: string | null;
			/** UI string thAt describes on whAt dAtA the breAkpoint is set on or why A dAtA breAkpoint is not AvAilAble. */
			description: string;
			/** OptionAl Attribute listing the AvAilAble Access types for A potentiAl dAtA breAkpoint. A UI frontend could surfAce this informAtion. */
			AccessTypes?: DAtABreAkpointAccessType[];
			/** OptionAl Attribute indicAting thAt A potentiAl dAtA breAkpoint could be persisted Across sessions. */
			cAnPersist?: booleAn;
		};
	}

	/** SetDAtABreAkpoints request; vAlue of commAnd field is 'setDAtABreAkpoints'.
		ReplAces All existing dAtA breAkpoints with new dAtA breAkpoints.
		To cleAr All dAtA breAkpoints, specify An empty ArrAy.
		When A dAtA breAkpoint is hit, A 'stopped' event (with reAson 'dAtA breAkpoint') is generAted.
		Clients should only cAll this request if the cApAbility 'supportsDAtABreAkpoints' is true.
	*/
	export interfAce SetDAtABreAkpointsRequest extends Request {
		// commAnd: 'setDAtABreAkpoints';
		Arguments: SetDAtABreAkpointsArguments;
	}

	/** Arguments for 'setDAtABreAkpoints' request. */
	export interfAce SetDAtABreAkpointsArguments {
		/** The contents of this ArrAy replAces All existing dAtA breAkpoints. An empty ArrAy cleArs All dAtA breAkpoints. */
		breAkpoints: DAtABreAkpoint[];
	}

	/** Response to 'setDAtABreAkpoints' request.
		Returned is informAtion About eAch breAkpoint creAted by this request.
	*/
	export interfAce SetDAtABreAkpointsResponse extends Response {
		body: {
			/** InformAtion About the dAtA breAkpoints. The ArrAy elements correspond to the elements of the input Argument 'breAkpoints' ArrAy. */
			breAkpoints: BreAkpoint[];
		};
	}

	/** SetInstructionBreAkpoints request; vAlue of commAnd field is 'setInstructionBreAkpoints'.
		ReplAces All existing instruction breAkpoints. TypicAlly, instruction breAkpoints would be set from A diAssembly window.
		To cleAr All instruction breAkpoints, specify An empty ArrAy.
		When An instruction breAkpoint is hit, A 'stopped' event (with reAson 'instruction breAkpoint') is generAted.
		Clients should only cAll this request if the cApAbility 'supportsInstructionBreAkpoints' is true.
	*/
	export interfAce SetInstructionBreAkpointsRequest extends Request {
		// commAnd: 'setInstructionBreAkpoints';
		Arguments: SetInstructionBreAkpointsArguments;
	}

	/** Arguments for 'setInstructionBreAkpoints' request */
	export interfAce SetInstructionBreAkpointsArguments {
		/** The instruction references of the breAkpoints */
		breAkpoints: InstructionBreAkpoint[];
	}

	/** Response to 'setInstructionBreAkpoints' request */
	export interfAce SetInstructionBreAkpointsResponse extends Response {
		body: {
			/** InformAtion About the breAkpoints. The ArrAy elements correspond to the elements of the 'breAkpoints' ArrAy. */
			breAkpoints: BreAkpoint[];
		};
	}

	/** Continue request; vAlue of commAnd field is 'continue'.
		The request stArts the debuggee to run AgAin.
	*/
	export interfAce ContinueRequest extends Request {
		// commAnd: 'continue';
		Arguments: ContinueArguments;
	}

	/** Arguments for 'continue' request. */
	export interfAce ContinueArguments {
		/** Continue execution for the specified threAd (if possible).
			If the bAckend cAnnot continue on A single threAd but will continue on All threAds, it should set the 'AllThreAdsContinued' Attribute in the response to true.
		*/
		threAdId: number;
	}

	/** Response to 'continue' request. */
	export interfAce ContinueResponse extends Response {
		body: {
			/** If true, the 'continue' request hAs ignored the specified threAd And continued All threAds insteAd.
				If this Attribute is missing A vAlue of 'true' is Assumed for bAckwArd compAtibility.
			*/
			AllThreAdsContinued?: booleAn;
		};
	}

	/** Next request; vAlue of commAnd field is 'next'.
		The request stArts the debuggee to run AgAin for one step.
		The debug AdApter first sends the response And then A 'stopped' event (with reAson 'step') After the step hAs completed.
	*/
	export interfAce NextRequest extends Request {
		// commAnd: 'next';
		Arguments: NextArguments;
	}

	/** Arguments for 'next' request. */
	export interfAce NextArguments {
		/** Execute 'next' for this threAd. */
		threAdId: number;
		/** OptionAl grAnulArity to step. If no grAnulArity is specified, A grAnulArity of 'stAtement' is Assumed. */
		grAnulArity?: SteppingGrAnulArity;
	}

	/** Response to 'next' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce NextResponse extends Response {
	}

	/** StepIn request; vAlue of commAnd field is 'stepIn'.
		The request stArts the debuggee to step into A function/method if possible.
		If it cAnnot step into A tArget, 'stepIn' behAves like 'next'.
		The debug AdApter first sends the response And then A 'stopped' event (with reAson 'step') After the step hAs completed.
		If there Are multiple function/method cAlls (or other tArgets) on the source line,
		the optionAl Argument 'tArgetId' cAn be used to control into which tArget the 'stepIn' should occur.
		The list of possible tArgets for A given source line cAn be retrieved viA the 'stepInTArgets' request.
	*/
	export interfAce StepInRequest extends Request {
		// commAnd: 'stepIn';
		Arguments: StepInArguments;
	}

	/** Arguments for 'stepIn' request. */
	export interfAce StepInArguments {
		/** Execute 'stepIn' for this threAd. */
		threAdId: number;
		/** OptionAl id of the tArget to step into. */
		tArgetId?: number;
		/** OptionAl grAnulArity to step. If no grAnulArity is specified, A grAnulArity of 'stAtement' is Assumed. */
		grAnulArity?: SteppingGrAnulArity;
	}

	/** Response to 'stepIn' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce StepInResponse extends Response {
	}

	/** StepOut request; vAlue of commAnd field is 'stepOut'.
		The request stArts the debuggee to run AgAin for one step.
		The debug AdApter first sends the response And then A 'stopped' event (with reAson 'step') After the step hAs completed.
	*/
	export interfAce StepOutRequest extends Request {
		// commAnd: 'stepOut';
		Arguments: StepOutArguments;
	}

	/** Arguments for 'stepOut' request. */
	export interfAce StepOutArguments {
		/** Execute 'stepOut' for this threAd. */
		threAdId: number;
		/** OptionAl grAnulArity to step. If no grAnulArity is specified, A grAnulArity of 'stAtement' is Assumed. */
		grAnulArity?: SteppingGrAnulArity;
	}

	/** Response to 'stepOut' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce StepOutResponse extends Response {
	}

	/** StepBAck request; vAlue of commAnd field is 'stepBAck'.
		The request stArts the debuggee to run one step bAckwArds.
		The debug AdApter first sends the response And then A 'stopped' event (with reAson 'step') After the step hAs completed.
		Clients should only cAll this request if the cApAbility 'supportsStepBAck' is true.
	*/
	export interfAce StepBAckRequest extends Request {
		// commAnd: 'stepBAck';
		Arguments: StepBAckArguments;
	}

	/** Arguments for 'stepBAck' request. */
	export interfAce StepBAckArguments {
		/** Execute 'stepBAck' for this threAd. */
		threAdId: number;
		/** OptionAl grAnulArity to step. If no grAnulArity is specified, A grAnulArity of 'stAtement' is Assumed. */
		grAnulArity?: SteppingGrAnulArity;
	}

	/** Response to 'stepBAck' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce StepBAckResponse extends Response {
	}

	/** ReverseContinue request; vAlue of commAnd field is 'reverseContinue'.
		The request stArts the debuggee to run bAckwArd.
		Clients should only cAll this request if the cApAbility 'supportsStepBAck' is true.
	*/
	export interfAce ReverseContinueRequest extends Request {
		// commAnd: 'reverseContinue';
		Arguments: ReverseContinueArguments;
	}

	/** Arguments for 'reverseContinue' request. */
	export interfAce ReverseContinueArguments {
		/** Execute 'reverseContinue' for this threAd. */
		threAdId: number;
	}

	/** Response to 'reverseContinue' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce ReverseContinueResponse extends Response {
	}

	/** RestArtFrAme request; vAlue of commAnd field is 'restArtFrAme'.
		The request restArts execution of the specified stAckfrAme.
		The debug AdApter first sends the response And then A 'stopped' event (with reAson 'restArt') After the restArt hAs completed.
		Clients should only cAll this request if the cApAbility 'supportsRestArtFrAme' is true.
	*/
	export interfAce RestArtFrAmeRequest extends Request {
		// commAnd: 'restArtFrAme';
		Arguments: RestArtFrAmeArguments;
	}

	/** Arguments for 'restArtFrAme' request. */
	export interfAce RestArtFrAmeArguments {
		/** RestArt this stAckfrAme. */
		frAmeId: number;
	}

	/** Response to 'restArtFrAme' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce RestArtFrAmeResponse extends Response {
	}

	/** Goto request; vAlue of commAnd field is 'goto'.
		The request sets the locAtion where the debuggee will continue to run.
		This mAkes it possible to skip the execution of code or to executed code AgAin.
		The code between the current locAtion And the goto tArget is not executed but skipped.
		The debug AdApter first sends the response And then A 'stopped' event with reAson 'goto'.
		Clients should only cAll this request if the cApAbility 'supportsGotoTArgetsRequest' is true (becAuse only then goto tArgets exist thAt cAn be pAssed As Arguments).
	*/
	export interfAce GotoRequest extends Request {
		// commAnd: 'goto';
		Arguments: GotoArguments;
	}

	/** Arguments for 'goto' request. */
	export interfAce GotoArguments {
		/** Set the goto tArget for this threAd. */
		threAdId: number;
		/** The locAtion where the debuggee will continue to run. */
		tArgetId: number;
	}

	/** Response to 'goto' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce GotoResponse extends Response {
	}

	/** PAuse request; vAlue of commAnd field is 'pAuse'.
		The request suspends the debuggee.
		The debug AdApter first sends the response And then A 'stopped' event (with reAson 'pAuse') After the threAd hAs been pAused successfully.
	*/
	export interfAce PAuseRequest extends Request {
		// commAnd: 'pAuse';
		Arguments: PAuseArguments;
	}

	/** Arguments for 'pAuse' request. */
	export interfAce PAuseArguments {
		/** PAuse execution for this threAd. */
		threAdId: number;
	}

	/** Response to 'pAuse' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce PAuseResponse extends Response {
	}

	/** StAckTrAce request; vAlue of commAnd field is 'stAckTrAce'.
		The request returns A stAcktrAce from the current execution stAte.
	*/
	export interfAce StAckTrAceRequest extends Request {
		// commAnd: 'stAckTrAce';
		Arguments: StAckTrAceArguments;
	}

	/** Arguments for 'stAckTrAce' request. */
	export interfAce StAckTrAceArguments {
		/** Retrieve the stAcktrAce for this threAd. */
		threAdId: number;
		/** The index of the first frAme to return; if omitted frAmes stArt At 0. */
		stArtFrAme?: number;
		/** The mAximum number of frAmes to return. If levels is not specified or 0, All frAmes Are returned. */
		levels?: number;
		/** Specifies detAils on how to formAt the stAck frAmes.
			The Attribute is only honored by A debug AdApter if the cApAbility 'supportsVAlueFormAttingOptions' is true.
		*/
		formAt?: StAckFrAmeFormAt;
	}

	/** Response to 'stAckTrAce' request. */
	export interfAce StAckTrAceResponse extends Response {
		body: {
			/** The frAmes of the stAckfrAme. If the ArrAy hAs length zero, there Are no stAckfrAmes AvAilAble.
				This meAns thAt there is no locAtion informAtion AvAilAble.
			*/
			stAckFrAmes: StAckFrAme[];
			/** The totAl number of frAmes AvAilAble. */
			totAlFrAmes?: number;
		};
	}

	/** Scopes request; vAlue of commAnd field is 'scopes'.
		The request returns the vAriAble scopes for A given stAckfrAme ID.
	*/
	export interfAce ScopesRequest extends Request {
		// commAnd: 'scopes';
		Arguments: ScopesArguments;
	}

	/** Arguments for 'scopes' request. */
	export interfAce ScopesArguments {
		/** Retrieve the scopes for this stAckfrAme. */
		frAmeId: number;
	}

	/** Response to 'scopes' request. */
	export interfAce ScopesResponse extends Response {
		body: {
			/** The scopes of the stAckfrAme. If the ArrAy hAs length zero, there Are no scopes AvAilAble. */
			scopes: Scope[];
		};
	}

	/** VAriAbles request; vAlue of commAnd field is 'vAriAbles'.
		Retrieves All child vAriAbles for the given vAriAble reference.
		An optionAl filter cAn be used to limit the fetched children to either nAmed or indexed children.
	*/
	export interfAce VAriAblesRequest extends Request {
		// commAnd: 'vAriAbles';
		Arguments: VAriAblesArguments;
	}

	/** Arguments for 'vAriAbles' request. */
	export interfAce VAriAblesArguments {
		/** The VAriAble reference. */
		vAriAblesReference: number;
		/** OptionAl filter to limit the child vAriAbles to either nAmed or indexed. If omitted, both types Are fetched. */
		filter?: 'indexed' | 'nAmed';
		/** The index of the first vAriAble to return; if omitted children stArt At 0. */
		stArt?: number;
		/** The number of vAriAbles to return. If count is missing or 0, All vAriAbles Are returned. */
		count?: number;
		/** Specifies detAils on how to formAt the VAriAble vAlues.
			The Attribute is only honored by A debug AdApter if the cApAbility 'supportsVAlueFormAttingOptions' is true.
		*/
		formAt?: VAlueFormAt;
	}

	/** Response to 'vAriAbles' request. */
	export interfAce VAriAblesResponse extends Response {
		body: {
			/** All (or A rAnge) of vAriAbles for the given vAriAble reference. */
			vAriAbles: VAriAble[];
		};
	}

	/** SetVAriAble request; vAlue of commAnd field is 'setVAriAble'.
		Set the vAriAble with the given nAme in the vAriAble contAiner to A new vAlue. Clients should only cAll this request if the cApAbility 'supportsSetVAriAble' is true.
	*/
	export interfAce SetVAriAbleRequest extends Request {
		// commAnd: 'setVAriAble';
		Arguments: SetVAriAbleArguments;
	}

	/** Arguments for 'setVAriAble' request. */
	export interfAce SetVAriAbleArguments {
		/** The reference of the vAriAble contAiner. */
		vAriAblesReference: number;
		/** The nAme of the vAriAble in the contAiner. */
		nAme: string;
		/** The vAlue of the vAriAble. */
		vAlue: string;
		/** Specifies detAils on how to formAt the response vAlue. */
		formAt?: VAlueFormAt;
	}

	/** Response to 'setVAriAble' request. */
	export interfAce SetVAriAbleResponse extends Response {
		body: {
			/** The new vAlue of the vAriAble. */
			vAlue: string;
			/** The type of the new vAlue. TypicAlly shown in the UI when hovering over the vAlue. */
			type?: string;
			/** If vAriAblesReference is > 0, the new vAlue is structured And its children cAn be retrieved by pAssing vAriAblesReference to the VAriAblesRequest.
				The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1).
			*/
			vAriAblesReference?: number;
			/** The number of nAmed child vAriAbles.
				The client cAn use this optionAl informAtion to present the vAriAbles in A pAged UI And fetch them in chunks.
				The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1).
			*/
			nAmedVAriAbles?: number;
			/** The number of indexed child vAriAbles.
				The client cAn use this optionAl informAtion to present the vAriAbles in A pAged UI And fetch them in chunks.
				The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1).
			*/
			indexedVAriAbles?: number;
		};
	}

	/** Source request; vAlue of commAnd field is 'source'.
		The request retrieves the source code for A given source reference.
	*/
	export interfAce SourceRequest extends Request {
		// commAnd: 'source';
		Arguments: SourceArguments;
	}

	/** Arguments for 'source' request. */
	export interfAce SourceArguments {
		/** Specifies the source content to loAd. Either source.pAth or source.sourceReference must be specified. */
		source?: Source;
		/** The reference to the source. This is the sAme As source.sourceReference.
			This is provided for bAckwArd compAtibility since old bAckends do not understAnd the 'source' Attribute.
		*/
		sourceReference: number;
	}

	/** Response to 'source' request. */
	export interfAce SourceResponse extends Response {
		body: {
			/** Content of the source reference. */
			content: string;
			/** OptionAl content type (mime type) of the source. */
			mimeType?: string;
		};
	}

	/** ThreAds request; vAlue of commAnd field is 'threAds'.
		The request retrieves A list of All threAds.
	*/
	export interfAce ThreAdsRequest extends Request {
		// commAnd: 'threAds';
	}

	/** Response to 'threAds' request. */
	export interfAce ThreAdsResponse extends Response {
		body: {
			/** All threAds. */
			threAds: ThreAd[];
		};
	}

	/** TerminAteThreAds request; vAlue of commAnd field is 'terminAteThreAds'.
		The request terminAtes the threAds with the given ids.
		Clients should only cAll this request if the cApAbility 'supportsTerminAteThreAdsRequest' is true.
	*/
	export interfAce TerminAteThreAdsRequest extends Request {
		// commAnd: 'terminAteThreAds';
		Arguments: TerminAteThreAdsArguments;
	}

	/** Arguments for 'terminAteThreAds' request. */
	export interfAce TerminAteThreAdsArguments {
		/** Ids of threAds to be terminAted. */
		threAdIds?: number[];
	}

	/** Response to 'terminAteThreAds' request. This is just An Acknowledgement, so no body field is required. */
	export interfAce TerminAteThreAdsResponse extends Response {
	}

	/** Modules request; vAlue of commAnd field is 'modules'.
		Modules cAn be retrieved from the debug AdApter with this request which cAn either return All modules or A rAnge of modules to support pAging.
		Clients should only cAll this request if the cApAbility 'supportsModulesRequest' is true.
	*/
	export interfAce ModulesRequest extends Request {
		// commAnd: 'modules';
		Arguments: ModulesArguments;
	}

	/** Arguments for 'modules' request. */
	export interfAce ModulesArguments {
		/** The index of the first module to return; if omitted modules stArt At 0. */
		stArtModule?: number;
		/** The number of modules to return. If moduleCount is not specified or 0, All modules Are returned. */
		moduleCount?: number;
	}

	/** Response to 'modules' request. */
	export interfAce ModulesResponse extends Response {
		body: {
			/** All modules or rAnge of modules. */
			modules: Module[];
			/** The totAl number of modules AvAilAble. */
			totAlModules?: number;
		};
	}

	/** LoAdedSources request; vAlue of commAnd field is 'loAdedSources'.
		Retrieves the set of All sources currently loAded by the debugged process.
		Clients should only cAll this request if the cApAbility 'supportsLoAdedSourcesRequest' is true.
	*/
	export interfAce LoAdedSourcesRequest extends Request {
		// commAnd: 'loAdedSources';
		Arguments?: LoAdedSourcesArguments;
	}

	/** Arguments for 'loAdedSources' request. */
	export interfAce LoAdedSourcesArguments {
	}

	/** Response to 'loAdedSources' request. */
	export interfAce LoAdedSourcesResponse extends Response {
		body: {
			/** Set of loAded sources. */
			sources: Source[];
		};
	}

	/** EvAluAte request; vAlue of commAnd field is 'evAluAte'.
		EvAluAtes the given expression in the context of the top most stAck frAme.
		The expression hAs Access to Any vAriAbles And Arguments thAt Are in scope.
	*/
	export interfAce EvAluAteRequest extends Request {
		// commAnd: 'evAluAte';
		Arguments: EvAluAteArguments;
	}

	/** Arguments for 'evAluAte' request. */
	export interfAce EvAluAteArguments {
		/** The expression to evAluAte. */
		expression: string;
		/** EvAluAte the expression in the scope of this stAck frAme. If not specified, the expression is evAluAted in the globAl scope. */
		frAmeId?: number;
		/** The context in which the evAluAte request is run.
			VAlues:
			'wAtch': evAluAte is run in A wAtch.
			'repl': evAluAte is run from REPL console.
			'hover': evAluAte is run from A dAtA hover.
			'clipboArd': evAluAte is run to generAte the vAlue thAt will be stored in the clipboArd.
			The Attribute is only honored by A debug AdApter if the cApAbility 'supportsClipboArdContext' is true.
			etc.
		*/
		context?: string;
		/** Specifies detAils on how to formAt the EvAluAte result.
			The Attribute is only honored by A debug AdApter if the cApAbility 'supportsVAlueFormAttingOptions' is true.
		*/
		formAt?: VAlueFormAt;
	}

	/** Response to 'evAluAte' request. */
	export interfAce EvAluAteResponse extends Response {
		body: {
			/** The result of the evAluAte request. */
			result: string;
			/** The optionAl type of the evAluAte result.
				This Attribute should only be returned by A debug AdApter if the client hAs pAssed the vAlue true for the 'supportsVAriAbleType' cApAbility of the 'initiAlize' request.
			*/
			type?: string;
			/** Properties of A evAluAte result thAt cAn be used to determine how to render the result in the UI. */
			presentAtionHint?: VAriAblePresentAtionHint;
			/** If vAriAblesReference is > 0, the evAluAte result is structured And its children cAn be retrieved by pAssing vAriAblesReference to the VAriAblesRequest.
				The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1).
			*/
			vAriAblesReference: number;
			/** The number of nAmed child vAriAbles.
				The client cAn use this optionAl informAtion to present the vAriAbles in A pAged UI And fetch them in chunks.
				The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1).
			*/
			nAmedVAriAbles?: number;
			/** The number of indexed child vAriAbles.
				The client cAn use this optionAl informAtion to present the vAriAbles in A pAged UI And fetch them in chunks.
				The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1).
			*/
			indexedVAriAbles?: number;
			/** OptionAl memory reference to A locAtion AppropriAte for this result.
				For pointer type evAl results, this is generAlly A reference to the memory Address contAined in the pointer.
				This Attribute should be returned by A debug AdApter if the client hAs pAssed the vAlue true for the 'supportsMemoryReferences' cApAbility of the 'initiAlize' request.
			*/
			memoryReference?: string;
		};
	}

	/** SetExpression request; vAlue of commAnd field is 'setExpression'.
		EvAluAtes the given 'vAlue' expression And Assigns it to the 'expression' which must be A modifiAble l-vAlue.
		The expressions hAve Access to Any vAriAbles And Arguments thAt Are in scope of the specified frAme.
		Clients should only cAll this request if the cApAbility 'supportsSetExpression' is true.
	*/
	export interfAce SetExpressionRequest extends Request {
		// commAnd: 'setExpression';
		Arguments: SetExpressionArguments;
	}

	/** Arguments for 'setExpression' request. */
	export interfAce SetExpressionArguments {
		/** The l-vAlue expression to Assign to. */
		expression: string;
		/** The vAlue expression to Assign to the l-vAlue expression. */
		vAlue: string;
		/** EvAluAte the expressions in the scope of this stAck frAme. If not specified, the expressions Are evAluAted in the globAl scope. */
		frAmeId?: number;
		/** Specifies how the resulting vAlue should be formAtted. */
		formAt?: VAlueFormAt;
	}

	/** Response to 'setExpression' request. */
	export interfAce SetExpressionResponse extends Response {
		body: {
			/** The new vAlue of the expression. */
			vAlue: string;
			/** The optionAl type of the vAlue.
				This Attribute should only be returned by A debug AdApter if the client hAs pAssed the vAlue true for the 'supportsVAriAbleType' cApAbility of the 'initiAlize' request.
			*/
			type?: string;
			/** Properties of A vAlue thAt cAn be used to determine how to render the result in the UI. */
			presentAtionHint?: VAriAblePresentAtionHint;
			/** If vAriAblesReference is > 0, the vAlue is structured And its children cAn be retrieved by pAssing vAriAblesReference to the VAriAblesRequest.
				The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1).
			*/
			vAriAblesReference?: number;
			/** The number of nAmed child vAriAbles.
				The client cAn use this optionAl informAtion to present the vAriAbles in A pAged UI And fetch them in chunks.
				The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1).
			*/
			nAmedVAriAbles?: number;
			/** The number of indexed child vAriAbles.
				The client cAn use this optionAl informAtion to present the vAriAbles in A pAged UI And fetch them in chunks.
				The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1).
			*/
			indexedVAriAbles?: number;
		};
	}

	/** StepInTArgets request; vAlue of commAnd field is 'stepInTArgets'.
		This request retrieves the possible stepIn tArgets for the specified stAck frAme.
		These tArgets cAn be used in the 'stepIn' request.
		The StepInTArgets mAy only be cAlled if the 'supportsStepInTArgetsRequest' cApAbility exists And is true.
		Clients should only cAll this request if the cApAbility 'supportsStepInTArgetsRequest' is true.
	*/
	export interfAce StepInTArgetsRequest extends Request {
		// commAnd: 'stepInTArgets';
		Arguments: StepInTArgetsArguments;
	}

	/** Arguments for 'stepInTArgets' request. */
	export interfAce StepInTArgetsArguments {
		/** The stAck frAme for which to retrieve the possible stepIn tArgets. */
		frAmeId: number;
	}

	/** Response to 'stepInTArgets' request. */
	export interfAce StepInTArgetsResponse extends Response {
		body: {
			/** The possible stepIn tArgets of the specified source locAtion. */
			tArgets: StepInTArget[];
		};
	}

	/** GotoTArgets request; vAlue of commAnd field is 'gotoTArgets'.
		This request retrieves the possible goto tArgets for the specified source locAtion.
		These tArgets cAn be used in the 'goto' request.
		Clients should only cAll this request if the cApAbility 'supportsGotoTArgetsRequest' is true.
	*/
	export interfAce GotoTArgetsRequest extends Request {
		// commAnd: 'gotoTArgets';
		Arguments: GotoTArgetsArguments;
	}

	/** Arguments for 'gotoTArgets' request. */
	export interfAce GotoTArgetsArguments {
		/** The source locAtion for which the goto tArgets Are determined. */
		source: Source;
		/** The line locAtion for which the goto tArgets Are determined. */
		line: number;
		/** An optionAl column locAtion for which the goto tArgets Are determined. */
		column?: number;
	}

	/** Response to 'gotoTArgets' request. */
	export interfAce GotoTArgetsResponse extends Response {
		body: {
			/** The possible goto tArgets of the specified locAtion. */
			tArgets: GotoTArget[];
		};
	}

	/** Completions request; vAlue of commAnd field is 'completions'.
		Returns A list of possible completions for A given cAret position And text.
		Clients should only cAll this request if the cApAbility 'supportsCompletionsRequest' is true.
	*/
	export interfAce CompletionsRequest extends Request {
		// commAnd: 'completions';
		Arguments: CompletionsArguments;
	}

	/** Arguments for 'completions' request. */
	export interfAce CompletionsArguments {
		/** Returns completions in the scope of this stAck frAme. If not specified, the completions Are returned for the globAl scope. */
		frAmeId?: number;
		/** One or more source lines. TypicAlly this is the text A user hAs typed into the debug console before he Asked for completion. */
		text: string;
		/** The chArActer position for which to determine the completion proposAls. */
		column: number;
		/** An optionAl line for which to determine the completion proposAls. If missing the first line of the text is Assumed. */
		line?: number;
	}

	/** Response to 'completions' request. */
	export interfAce CompletionsResponse extends Response {
		body: {
			/** The possible completions for . */
			tArgets: CompletionItem[];
		};
	}

	/** ExceptionInfo request; vAlue of commAnd field is 'exceptionInfo'.
		Retrieves the detAils of the exception thAt cAused this event to be rAised.
		Clients should only cAll this request if the cApAbility 'supportsExceptionInfoRequest' is true.
	*/
	export interfAce ExceptionInfoRequest extends Request {
		// commAnd: 'exceptionInfo';
		Arguments: ExceptionInfoArguments;
	}

	/** Arguments for 'exceptionInfo' request. */
	export interfAce ExceptionInfoArguments {
		/** ThreAd for which exception informAtion should be retrieved. */
		threAdId: number;
	}

	/** Response to 'exceptionInfo' request. */
	export interfAce ExceptionInfoResponse extends Response {
		body: {
			/** ID of the exception thAt wAs thrown. */
			exceptionId: string;
			/** Descriptive text for the exception provided by the debug AdApter. */
			description?: string;
			/** Mode thAt cAused the exception notificAtion to be rAised. */
			breAkMode: ExceptionBreAkMode;
			/** DetAiled informAtion About the exception. */
			detAils?: ExceptionDetAils;
		};
	}

	/** ReAdMemory request; vAlue of commAnd field is 'reAdMemory'.
		ReAds bytes from memory At the provided locAtion.
		Clients should only cAll this request if the cApAbility 'supportsReAdMemoryRequest' is true.
	*/
	export interfAce ReAdMemoryRequest extends Request {
		// commAnd: 'reAdMemory';
		Arguments: ReAdMemoryArguments;
	}

	/** Arguments for 'reAdMemory' request. */
	export interfAce ReAdMemoryArguments {
		/** Memory reference to the bAse locAtion from which dAtA should be reAd. */
		memoryReference: string;
		/** OptionAl offset (in bytes) to be Applied to the reference locAtion before reAding dAtA. CAn be negAtive. */
		offset?: number;
		/** Number of bytes to reAd At the specified locAtion And offset. */
		count: number;
	}

	/** Response to 'reAdMemory' request. */
	export interfAce ReAdMemoryResponse extends Response {
		body?: {
			/** The Address of the first byte of dAtA returned.
				TreAted As A hex vAlue if prefixed with '0x', or As A decimAl vAlue otherwise.
			*/
			Address: string;
			/** The number of unreAdAble bytes encountered After the lAst successfully reAd byte.
				This cAn be used to determine the number of bytes thAt must be skipped before A subsequent 'reAdMemory' request will succeed.
			*/
			unreAdAbleBytes?: number;
			/** The bytes reAd from memory, encoded using bAse64. */
			dAtA?: string;
		};
	}

	/** DisAssemble request; vAlue of commAnd field is 'disAssemble'.
		DisAssembles code stored At the provided locAtion.
		Clients should only cAll this request if the cApAbility 'supportsDisAssembleRequest' is true.
	*/
	export interfAce DisAssembleRequest extends Request {
		// commAnd: 'disAssemble';
		Arguments: DisAssembleArguments;
	}

	/** Arguments for 'disAssemble' request. */
	export interfAce DisAssembleArguments {
		/** Memory reference to the bAse locAtion contAining the instructions to disAssemble. */
		memoryReference: string;
		/** OptionAl offset (in bytes) to be Applied to the reference locAtion before disAssembling. CAn be negAtive. */
		offset?: number;
		/** OptionAl offset (in instructions) to be Applied After the byte offset (if Any) before disAssembling. CAn be negAtive. */
		instructionOffset?: number;
		/** Number of instructions to disAssemble stArting At the specified locAtion And offset.
			An AdApter must return exActly this number of instructions - Any unAvAilAble instructions should be replAced with An implementAtion-defined 'invAlid instruction' vAlue.
		*/
		instructionCount: number;
		/** If true, the AdApter should Attempt to resolve memory Addresses And other vAlues to symbolic nAmes. */
		resolveSymbols?: booleAn;
	}

	/** Response to 'disAssemble' request. */
	export interfAce DisAssembleResponse extends Response {
		body?: {
			/** The list of disAssembled instructions. */
			instructions: DisAssembledInstruction[];
		};
	}

	/** InformAtion About the cApAbilities of A debug AdApter. */
	export interfAce CApAbilities {
		/** The debug AdApter supports the 'configurAtionDone' request. */
		supportsConfigurAtionDoneRequest?: booleAn;
		/** The debug AdApter supports function breAkpoints. */
		supportsFunctionBreAkpoints?: booleAn;
		/** The debug AdApter supports conditionAl breAkpoints. */
		supportsConditionAlBreAkpoints?: booleAn;
		/** The debug AdApter supports breAkpoints thAt breAk execution After A specified number of hits. */
		supportsHitConditionAlBreAkpoints?: booleAn;
		/** The debug AdApter supports A (side effect free) evAluAte request for dAtA hovers. */
		supportsEvAluAteForHovers?: booleAn;
		/** AvAilAble filters or options for the setExceptionBreAkpoints request. */
		exceptionBreAkpointFilters?: ExceptionBreAkpointsFilter[];
		/** The debug AdApter supports stepping bAck viA the 'stepBAck' And 'reverseContinue' requests. */
		supportsStepBAck?: booleAn;
		/** The debug AdApter supports setting A vAriAble to A vAlue. */
		supportsSetVAriAble?: booleAn;
		/** The debug AdApter supports restArting A frAme. */
		supportsRestArtFrAme?: booleAn;
		/** The debug AdApter supports the 'gotoTArgets' request. */
		supportsGotoTArgetsRequest?: booleAn;
		/** The debug AdApter supports the 'stepInTArgets' request. */
		supportsStepInTArgetsRequest?: booleAn;
		/** The debug AdApter supports the 'completions' request. */
		supportsCompletionsRequest?: booleAn;
		/** The set of chArActers thAt should trigger completion in A REPL. If not specified, the UI should Assume the '.' chArActer. */
		completionTriggerChArActers?: string[];
		/** The debug AdApter supports the 'modules' request. */
		supportsModulesRequest?: booleAn;
		/** The set of AdditionAl module informAtion exposed by the debug AdApter. */
		AdditionAlModuleColumns?: ColumnDescriptor[];
		/** Checksum Algorithms supported by the debug AdApter. */
		supportedChecksumAlgorithms?: ChecksumAlgorithm[];
		/** The debug AdApter supports the 'restArt' request. In this cAse A client should not implement 'restArt' by terminAting And relAunching the AdApter but by cAlling the RestArtRequest. */
		supportsRestArtRequest?: booleAn;
		/** The debug AdApter supports 'exceptionOptions' on the setExceptionBreAkpoints request. */
		supportsExceptionOptions?: booleAn;
		/** The debug AdApter supports A 'formAt' Attribute on the stAckTrAceRequest, vAriAblesRequest, And evAluAteRequest. */
		supportsVAlueFormAttingOptions?: booleAn;
		/** The debug AdApter supports the 'exceptionInfo' request. */
		supportsExceptionInfoRequest?: booleAn;
		/** The debug AdApter supports the 'terminAteDebuggee' Attribute on the 'disconnect' request. */
		supportTerminAteDebuggee?: booleAn;
		/** The debug AdApter supports the delAyed loAding of pArts of the stAck, which requires thAt both the 'stArtFrAme' And 'levels' Arguments And the 'totAlFrAmes' result of the 'StAckTrAce' request Are supported. */
		supportsDelAyedStAckTrAceLoAding?: booleAn;
		/** The debug AdApter supports the 'loAdedSources' request. */
		supportsLoAdedSourcesRequest?: booleAn;
		/** The debug AdApter supports logpoints by interpreting the 'logMessAge' Attribute of the SourceBreAkpoint. */
		supportsLogPoints?: booleAn;
		/** The debug AdApter supports the 'terminAteThreAds' request. */
		supportsTerminAteThreAdsRequest?: booleAn;
		/** The debug AdApter supports the 'setExpression' request. */
		supportsSetExpression?: booleAn;
		/** The debug AdApter supports the 'terminAte' request. */
		supportsTerminAteRequest?: booleAn;
		/** The debug AdApter supports dAtA breAkpoints. */
		supportsDAtABreAkpoints?: booleAn;
		/** The debug AdApter supports the 'reAdMemory' request. */
		supportsReAdMemoryRequest?: booleAn;
		/** The debug AdApter supports the 'disAssemble' request. */
		supportsDisAssembleRequest?: booleAn;
		/** The debug AdApter supports the 'cAncel' request. */
		supportsCAncelRequest?: booleAn;
		/** The debug AdApter supports the 'breAkpointLocAtions' request. */
		supportsBreAkpointLocAtionsRequest?: booleAn;
		/** The debug AdApter supports the 'clipboArd' context vAlue in the 'evAluAte' request. */
		supportsClipboArdContext?: booleAn;
		/** The debug AdApter supports stepping grAnulArities (Argument 'grAnulArity') for the stepping requests. */
		supportsSteppingGrAnulArity?: booleAn;
		/** The debug AdApter supports Adding breAkpoints bAsed on instruction references. */
		supportsInstructionBreAkpoints?: booleAn;
	}

	/** An ExceptionBreAkpointsFilter is shown in the UI As An option for configuring how exceptions Are deAlt with. */
	export interfAce ExceptionBreAkpointsFilter {
		/** The internAl ID of the filter. This vAlue is pAssed to the setExceptionBreAkpoints request. */
		filter: string;
		/** The nAme of the filter. This will be shown in the UI. */
		lAbel: string;
		/** InitiAl vAlue of the filter. If not specified A vAlue 'fAlse' is Assumed. */
		defAult?: booleAn;
	}

	/** A structured messAge object. Used to return errors from requests. */
	export interfAce MessAge {
		/** Unique identifier for the messAge. */
		id: number;
		/** A formAt string for the messAge. Embedded vAriAbles hAve the form '{nAme}'.
			If vAriAble nAme stArts with An underscore chArActer, the vAriAble does not contAin user dAtA (PII) And cAn be sAfely used for telemetry purposes.
		*/
		formAt: string;
		/** An object used As A dictionAry for looking up the vAriAbles in the formAt string. */
		vAriAbles?: { [key: string]: string; };
		/** If true send to telemetry. */
		sendTelemetry?: booleAn;
		/** If true show user. */
		showUser?: booleAn;
		/** An optionAl url where AdditionAl informAtion About this messAge cAn be found. */
		url?: string;
		/** An optionAl lAbel thAt is presented to the user As the UI for opening the url. */
		urlLAbel?: string;
	}

	/** A Module object represents A row in the modules view.
		Two Attributes Are mAndAtory: An id identifies A module in the modules view And is used in A ModuleEvent for identifying A module for Adding, updAting or deleting.
		The nAme is used to minimAlly render the module in the UI.

		AdditionAl Attributes cAn be Added to the module. They will show up in the module View if they hAve A corresponding ColumnDescriptor.

		To Avoid An unnecessAry proliferAtion of AdditionAl Attributes with similAr semAntics but different nAmes
		we recommend to re-use Attributes from the 'recommended' list below first, And only introduce new Attributes if nothing AppropriAte could be found.
	*/
	export interfAce Module {
		/** Unique identifier for the module. */
		id: number | string;
		/** A nAme of the module. */
		nAme: string;
		/** optionAl but recommended Attributes.
			AlwAys try to use these first before introducing AdditionAl Attributes.

			LogicAl full pAth to the module. The exAct definition is implementAtion defined, but usuAlly this would be A full pAth to the on-disk file for the module.
		*/
		pAth?: string;
		/** True if the module is optimized. */
		isOptimized?: booleAn;
		/** True if the module is considered 'user code' by A debugger thAt supports 'Just My Code'. */
		isUserCode?: booleAn;
		/** Version of Module. */
		version?: string;
		/** User understAndAble description of if symbols were found for the module (ex: 'Symbols LoAded', 'Symbols not found', etc. */
		symbolStAtus?: string;
		/** LogicAl full pAth to the symbol file. The exAct definition is implementAtion defined. */
		symbolFilePAth?: string;
		/** Module creAted or modified. */
		dAteTimeStAmp?: string;
		/** Address rAnge covered by this module. */
		AddressRAnge?: string;
	}

	/** A ColumnDescriptor specifies whAt module Attribute to show in A column of the ModulesView, how to formAt it,
		And whAt the column's lAbel should be.
		It is only used if the underlying UI ActuAlly supports this level of customizAtion.
	*/
	export interfAce ColumnDescriptor {
		/** NAme of the Attribute rendered in this column. */
		AttributeNAme: string;
		/** HeAder UI lAbel of column. */
		lAbel: string;
		/** FormAt to use for the rendered vAlues in this column. TBD how the formAt strings looks like. */
		formAt?: string;
		/** DAtAtype of vAlues in this column.  DefAults to 'string' if not specified. */
		type?: 'string' | 'number' | 'booleAn' | 'unixTimestAmpUTC';
		/** Width of this column in chArActers (hint only). */
		width?: number;
	}

	/** The ModulesViewDescriptor is the contAiner for All declArAtive configurAtion options of A ModuleView.
		For now it only specifies the columns to be shown in the modules view.
	*/
	export interfAce ModulesViewDescriptor {
		columns: ColumnDescriptor[];
	}

	/** A ThreAd */
	export interfAce ThreAd {
		/** Unique identifier for the threAd. */
		id: number;
		/** A nAme of the threAd. */
		nAme: string;
	}

	/** A Source is A descriptor for source code.
		It is returned from the debug AdApter As pArt of A StAckFrAme And it is used by clients when specifying breAkpoints.
	*/
	export interfAce Source {
		/** The short nAme of the source. Every source returned from the debug AdApter hAs A nAme.
			When sending A source to the debug AdApter this nAme is optionAl.
		*/
		nAme?: string;
		/** The pAth of the source to be shown in the UI.
			It is only used to locAte And loAd the content of the source if no sourceReference is specified (or its vAlue is 0).
		*/
		pAth?: string;
		/** If sourceReference > 0 the contents of the source must be retrieved through the SourceRequest (even if A pAth is specified).
			A sourceReference is only vAlid for A session, so it must not be used to persist A source.
			The vAlue should be less thAn or equAl to 2147483647 (2^31 - 1).
		*/
		sourceReference?: number;
		/** An optionAl hint for how to present the source in the UI.
			A vAlue of 'deemphAsize' cAn be used to indicAte thAt the source is not AvAilAble or thAt it is skipped on stepping.
		*/
		presentAtionHint?: 'normAl' | 'emphAsize' | 'deemphAsize';
		/** The (optionAl) origin of this source: possible vAlues 'internAl module', 'inlined content from source mAp', etc. */
		origin?: string;
		/** An optionAl list of sources thAt Are relAted to this source. These mAy be the source thAt generAted this source. */
		sources?: Source[];
		/** OptionAl dAtA thAt A debug AdApter might wAnt to loop through the client.
			The client should leAve the dAtA intAct And persist it Across sessions. The client should not interpret the dAtA.
		*/
		AdApterDAtA?: Any;
		/** The checksums AssociAted with this file. */
		checksums?: Checksum[];
	}

	/** A StAckfrAme contAins the source locAtion. */
	export interfAce StAckFrAme {
		/** An identifier for the stAck frAme. It must be unique Across All threAds.
			This id cAn be used to retrieve the scopes of the frAme with the 'scopesRequest' or to restArt the execution of A stAckfrAme.
		*/
		id: number;
		/** The nAme of the stAck frAme, typicAlly A method nAme. */
		nAme: string;
		/** The optionAl source of the frAme. */
		source?: Source;
		/** The line within the file of the frAme. If source is null or doesn't exist, line is 0 And must be ignored. */
		line: number;
		/** The column within the line. If source is null or doesn't exist, column is 0 And must be ignored. */
		column: number;
		/** An optionAl end line of the rAnge covered by the stAck frAme. */
		endLine?: number;
		/** An optionAl end column of the rAnge covered by the stAck frAme. */
		endColumn?: number;
		/** OptionAl memory reference for the current instruction pointer in this frAme. */
		instructionPointerReference?: string;
		/** The module AssociAted with this frAme, if Any. */
		moduleId?: number | string;
		/** An optionAl hint for how to present this frAme in the UI.
			A vAlue of 'lAbel' cAn be used to indicAte thAt the frAme is An ArtificiAl frAme thAt is used As A visuAl lAbel or sepArAtor. A vAlue of 'subtle' cAn be used to chAnge the AppeArAnce of A frAme in A 'subtle' wAy.
		*/
		presentAtionHint?: 'normAl' | 'lAbel' | 'subtle';
	}

	/** A Scope is A nAmed contAiner for vAriAbles. OptionAlly A scope cAn mAp to A source or A rAnge within A source. */
	export interfAce Scope {
		/** NAme of the scope such As 'Arguments', 'LocAls', or 'Registers'. This string is shown in the UI As is And cAn be trAnslAted. */
		nAme: string;
		/** An optionAl hint for how to present this scope in the UI. If this Attribute is missing, the scope is shown with A generic UI.
			VAlues:
			'Arguments': Scope contAins method Arguments.
			'locAls': Scope contAins locAl vAriAbles.
			'registers': Scope contAins registers. Only A single 'registers' scope should be returned from A 'scopes' request.
			etc.
		*/
		presentAtionHint?: string;
		/** The vAriAbles of this scope cAn be retrieved by pAssing the vAlue of vAriAblesReference to the VAriAblesRequest. */
		vAriAblesReference: number;
		/** The number of nAmed vAriAbles in this scope.
			The client cAn use this optionAl informAtion to present the vAriAbles in A pAged UI And fetch them in chunks.
		*/
		nAmedVAriAbles?: number;
		/** The number of indexed vAriAbles in this scope.
			The client cAn use this optionAl informAtion to present the vAriAbles in A pAged UI And fetch them in chunks.
		*/
		indexedVAriAbles?: number;
		/** If true, the number of vAriAbles in this scope is lArge or expensive to retrieve. */
		expensive: booleAn;
		/** OptionAl source for this scope. */
		source?: Source;
		/** OptionAl stArt line of the rAnge covered by this scope. */
		line?: number;
		/** OptionAl stArt column of the rAnge covered by this scope. */
		column?: number;
		/** OptionAl end line of the rAnge covered by this scope. */
		endLine?: number;
		/** OptionAl end column of the rAnge covered by this scope. */
		endColumn?: number;
	}

	/** A VAriAble is A nAme/vAlue pAir.
		OptionAlly A vAriAble cAn hAve A 'type' thAt is shown if spAce permits or when hovering over the vAriAble's nAme.
		An optionAl 'kind' is used to render AdditionAl properties of the vAriAble, e.g. different icons cAn be used to indicAte thAt A vAriAble is public or privAte.
		If the vAlue is structured (hAs children), A hAndle is provided to retrieve the children with the VAriAblesRequest.
		If the number of nAmed or indexed children is lArge, the numbers should be returned viA the optionAl 'nAmedVAriAbles' And 'indexedVAriAbles' Attributes.
		The client cAn use this optionAl informAtion to present the children in A pAged UI And fetch them in chunks.
	*/
	export interfAce VAriAble {
		/** The vAriAble's nAme. */
		nAme: string;
		/** The vAriAble's vAlue. This cAn be A multi-line text, e.g. for A function the body of A function. */
		vAlue: string;
		/** The type of the vAriAble's vAlue. TypicAlly shown in the UI when hovering over the vAlue.
			This Attribute should only be returned by A debug AdApter if the client hAs pAssed the vAlue true for the 'supportsVAriAbleType' cApAbility of the 'initiAlize' request.
		*/
		type?: string;
		/** Properties of A vAriAble thAt cAn be used to determine how to render the vAriAble in the UI. */
		presentAtionHint?: VAriAblePresentAtionHint;
		/** OptionAl evAluAtAble nAme of this vAriAble which cAn be pAssed to the 'EvAluAteRequest' to fetch the vAriAble's vAlue. */
		evAluAteNAme?: string;
		/** If vAriAblesReference is > 0, the vAriAble is structured And its children cAn be retrieved by pAssing vAriAblesReference to the VAriAblesRequest. */
		vAriAblesReference: number;
		/** The number of nAmed child vAriAbles.
			The client cAn use this optionAl informAtion to present the children in A pAged UI And fetch them in chunks.
		*/
		nAmedVAriAbles?: number;
		/** The number of indexed child vAriAbles.
			The client cAn use this optionAl informAtion to present the children in A pAged UI And fetch them in chunks.
		*/
		indexedVAriAbles?: number;
		/** OptionAl memory reference for the vAriAble if the vAriAble represents executAble code, such As A function pointer.
			This Attribute is only required if the client hAs pAssed the vAlue true for the 'supportsMemoryReferences' cApAbility of the 'initiAlize' request.
		*/
		memoryReference?: string;
	}

	/** OptionAl properties of A vAriAble thAt cAn be used to determine how to render the vAriAble in the UI. */
	export interfAce VAriAblePresentAtionHint {
		/** The kind of vAriAble. Before introducing AdditionAl vAlues, try to use the listed vAlues.
			VAlues:
			'property': IndicAtes thAt the object is A property.
			'method': IndicAtes thAt the object is A method.
			'clAss': IndicAtes thAt the object is A clAss.
			'dAtA': IndicAtes thAt the object is dAtA.
			'event': IndicAtes thAt the object is An event.
			'bAseClAss': IndicAtes thAt the object is A bAse clAss.
			'innerClAss': IndicAtes thAt the object is An inner clAss.
			'interfAce': IndicAtes thAt the object is An interfAce.
			'mostDerivedClAss': IndicAtes thAt the object is the most derived clAss.
			'virtuAl': IndicAtes thAt the object is virtuAl, thAt meAns it is A synthetic object introducedby the
			AdApter for rendering purposes, e.g. An index rAnge for lArge ArrAys.
			'dAtABreAkpoint': IndicAtes thAt A dAtA breAkpoint is registered for the object.
			etc.
		*/
		kind?: string;
		/** Set of Attributes represented As An ArrAy of strings. Before introducing AdditionAl vAlues, try to use the listed vAlues.
			VAlues:
			'stAtic': IndicAtes thAt the object is stAtic.
			'constAnt': IndicAtes thAt the object is A constAnt.
			'reAdOnly': IndicAtes thAt the object is reAd only.
			'rAwString': IndicAtes thAt the object is A rAw string.
			'hAsObjectId': IndicAtes thAt the object cAn hAve An Object ID creAted for it.
			'cAnHAveObjectId': IndicAtes thAt the object hAs An Object ID AssociAted with it.
			'hAsSideEffects': IndicAtes thAt the evAluAtion hAd side effects.
			etc.
		*/
		Attributes?: string[];
		/** Visibility of vAriAble. Before introducing AdditionAl vAlues, try to use the listed vAlues.
			VAlues: 'public', 'privAte', 'protected', 'internAl', 'finAl', etc.
		*/
		visibility?: string;
	}

	/** Properties of A breAkpoint locAtion returned from the 'breAkpointLocAtions' request. */
	export interfAce BreAkpointLocAtion {
		/** StArt line of breAkpoint locAtion. */
		line: number;
		/** OptionAl stArt column of breAkpoint locAtion. */
		column?: number;
		/** OptionAl end line of breAkpoint locAtion if the locAtion covers A rAnge. */
		endLine?: number;
		/** OptionAl end column of breAkpoint locAtion if the locAtion covers A rAnge. */
		endColumn?: number;
	}

	/** Properties of A breAkpoint or logpoint pAssed to the setBreAkpoints request. */
	export interfAce SourceBreAkpoint {
		/** The source line of the breAkpoint or logpoint. */
		line: number;
		/** An optionAl source column of the breAkpoint. */
		column?: number;
		/** An optionAl expression for conditionAl breAkpoints.
			It is only honored by A debug AdApter if the cApAbility 'supportsConditionAlBreAkpoints' is true.
		*/
		condition?: string;
		/** An optionAl expression thAt controls how mAny hits of the breAkpoint Are ignored.
			The bAckend is expected to interpret the expression As needed.
			The Attribute is only honored by A debug AdApter if the cApAbility 'supportsHitConditionAlBreAkpoints' is true.
		*/
		hitCondition?: string;
		/** If this Attribute exists And is non-empty, the bAckend must not 'breAk' (stop)
			but log the messAge insteAd. Expressions within {} Are interpolAted.
			The Attribute is only honored by A debug AdApter if the cApAbility 'supportsLogPoints' is true.
		*/
		logMessAge?: string;
	}

	/** Properties of A breAkpoint pAssed to the setFunctionBreAkpoints request. */
	export interfAce FunctionBreAkpoint {
		/** The nAme of the function. */
		nAme: string;
		/** An optionAl expression for conditionAl breAkpoints.
			It is only honored by A debug AdApter if the cApAbility 'supportsConditionAlBreAkpoints' is true.
		*/
		condition?: string;
		/** An optionAl expression thAt controls how mAny hits of the breAkpoint Are ignored.
			The bAckend is expected to interpret the expression As needed.
			The Attribute is only honored by A debug AdApter if the cApAbility 'supportsHitConditionAlBreAkpoints' is true.
		*/
		hitCondition?: string;
	}

	/** This enumerAtion defines All possible Access types for dAtA breAkpoints. */
	export type DAtABreAkpointAccessType = 'reAd' | 'write' | 'reAdWrite';

	/** Properties of A dAtA breAkpoint pAssed to the setDAtABreAkpoints request. */
	export interfAce DAtABreAkpoint {
		/** An id representing the dAtA. This id is returned from the dAtABreAkpointInfo request. */
		dAtAId: string;
		/** The Access type of the dAtA. */
		AccessType?: DAtABreAkpointAccessType;
		/** An optionAl expression for conditionAl breAkpoints. */
		condition?: string;
		/** An optionAl expression thAt controls how mAny hits of the breAkpoint Are ignored.
			The bAckend is expected to interpret the expression As needed.
		*/
		hitCondition?: string;
	}

	/** Properties of A breAkpoint pAssed to the setInstructionBreAkpoints request */
	export interfAce InstructionBreAkpoint {
		/** The instruction reference of the breAkpoint.
			This should be A memory or instruction pointer reference from An EvAluAteResponse, VAriAble, StAckFrAme, GotoTArget, or BreAkpoint.
		*/
		instructionReference: string;
		/** An optionAl offset from the instruction reference.
			This cAn be negAtive.
		*/
		offset?: number;
		/** An optionAl expression for conditionAl breAkpoints.
			It is only honored by A debug AdApter if the cApAbility 'supportsConditionAlBreAkpoints' is true.
		*/
		condition?: string;
		/** An optionAl expression thAt controls how mAny hits of the breAkpoint Are ignored.
			The bAckend is expected to interpret the expression As needed.
			The Attribute is only honored by A debug AdApter if the cApAbility 'supportsHitConditionAlBreAkpoints' is true.
		*/
		hitCondition?: string;
	}

	/** InformAtion About A BreAkpoint creAted in setBreAkpoints, setFunctionBreAkpoints, setInstructionBreAkpoints, or setDAtABreAkpoints. */
	export interfAce BreAkpoint {
		/** An optionAl identifier for the breAkpoint. It is needed if breAkpoint events Are used to updAte or remove breAkpoints. */
		id?: number;
		/** If true breAkpoint could be set (but not necessArily At the desired locAtion). */
		verified: booleAn;
		/** An optionAl messAge About the stAte of the breAkpoint.
			This is shown to the user And cAn be used to explAin why A breAkpoint could not be verified.
		*/
		messAge?: string;
		/** The source where the breAkpoint is locAted. */
		source?: Source;
		/** The stArt line of the ActuAl rAnge covered by the breAkpoint. */
		line?: number;
		/** An optionAl stArt column of the ActuAl rAnge covered by the breAkpoint. */
		column?: number;
		/** An optionAl end line of the ActuAl rAnge covered by the breAkpoint. */
		endLine?: number;
		/** An optionAl end column of the ActuAl rAnge covered by the breAkpoint.
			If no end line is given, then the end column is Assumed to be in the stArt line.
		*/
		endColumn?: number;
		/** An optionAl memory reference to where the breAkpoint is set. */
		instructionReference?: string;
		/** An optionAl offset from the instruction reference.
			This cAn be negAtive.
		*/
		offset?: number;
	}

	/** The grAnulArity of one 'step' in the stepping requests 'next', 'stepIn', 'stepOut', And 'stepBAck'.
		'stAtement': The step should Allow the progrAm to run until the current stAtement hAs finished executing.
		The meAning of A stAtement is determined by the AdApter And it mAy be considered equivAlent to A line.
		For exAmple 'for(int i = 0; i < 10; i++) could be considered to hAve 3 stAtements 'int i = 0', 'i < 10', And 'i++'.
		'line': The step should Allow the progrAm to run until the current source line hAs executed.
		'instruction': The step should Allow one instruction to execute (e.g. one x86 instruction).
	*/
	export type SteppingGrAnulArity = 'stAtement' | 'line' | 'instruction';

	/** A StepInTArget cAn be used in the 'stepIn' request And determines into which single tArget the stepIn request should step. */
	export interfAce StepInTArget {
		/** Unique identifier for A stepIn tArget. */
		id: number;
		/** The nAme of the stepIn tArget (shown in the UI). */
		lAbel: string;
	}

	/** A GotoTArget describes A code locAtion thAt cAn be used As A tArget in the 'goto' request.
		The possible goto tArgets cAn be determined viA the 'gotoTArgets' request.
	*/
	export interfAce GotoTArget {
		/** Unique identifier for A goto tArget. This is used in the goto request. */
		id: number;
		/** The nAme of the goto tArget (shown in the UI). */
		lAbel: string;
		/** The line of the goto tArget. */
		line: number;
		/** An optionAl column of the goto tArget. */
		column?: number;
		/** An optionAl end line of the rAnge covered by the goto tArget. */
		endLine?: number;
		/** An optionAl end column of the rAnge covered by the goto tArget. */
		endColumn?: number;
		/** OptionAl memory reference for the instruction pointer vAlue represented by this tArget. */
		instructionPointerReference?: string;
	}

	/** CompletionItems Are the suggestions returned from the CompletionsRequest. */
	export interfAce CompletionItem {
		/** The lAbel of this completion item. By defAult this is Also the text thAt is inserted when selecting this completion. */
		lAbel: string;
		/** If text is not fAlsy then it is inserted insteAd of the lAbel. */
		text?: string;
		/** A string thAt should be used when compAring this item with other items. When `fAlsy` the lAbel is used. */
		sortText?: string;
		/** The item's type. TypicAlly the client uses this informAtion to render the item in the UI with An icon. */
		type?: CompletionItemType;
		/** This vAlue determines the locAtion (in the CompletionsRequest's 'text' Attribute) where the completion text is Added.
			If missing the text is Added At the locAtion specified by the CompletionsRequest's 'column' Attribute.
		*/
		stArt?: number;
		/** This vAlue determines how mAny chArActers Are overwritten by the completion text.
			If missing the vAlue 0 is Assumed which results in the completion text being inserted.
		*/
		length?: number;
		/** Determines the stArt of the new selection After the text hAs been inserted (or replAced).
			The stArt position must in the rAnge 0 And length of the completion text.
			If omitted the selection stArts At the end of the completion text.
		*/
		selectionStArt?: number;
		/** Determines the length of the new selection After the text hAs been inserted (or replAced).
			The selection cAn not extend beyond the bounds of the completion text.
			If omitted the length is Assumed to be 0.
		*/
		selectionLength?: number;
	}

	/** Some predefined types for the CompletionItem. PleAse note thAt not All clients hAve specific icons for All of them. */
	export type CompletionItemType = 'method' | 'function' | 'constructor' | 'field' | 'vAriAble' | 'clAss' | 'interfAce' | 'module' | 'property' | 'unit' | 'vAlue' | 'enum' | 'keyword' | 'snippet' | 'text' | 'color' | 'file' | 'reference' | 'customcolor';

	/** NAmes of checksum Algorithms thAt mAy be supported by A debug AdApter. */
	export type ChecksumAlgorithm = 'MD5' | 'SHA1' | 'SHA256' | 'timestAmp';

	/** The checksum of An item cAlculAted by the specified Algorithm. */
	export interfAce Checksum {
		/** The Algorithm used to cAlculAte this checksum. */
		Algorithm: ChecksumAlgorithm;
		/** VAlue of the checksum. */
		checksum: string;
	}

	/** Provides formAtting informAtion for A vAlue. */
	export interfAce VAlueFormAt {
		/** DisplAy the vAlue in hex. */
		hex?: booleAn;
	}

	/** Provides formAtting informAtion for A stAck frAme. */
	export interfAce StAckFrAmeFormAt extends VAlueFormAt {
		/** DisplAys pArAmeters for the stAck frAme. */
		pArAmeters?: booleAn;
		/** DisplAys the types of pArAmeters for the stAck frAme. */
		pArAmeterTypes?: booleAn;
		/** DisplAys the nAmes of pArAmeters for the stAck frAme. */
		pArAmeterNAmes?: booleAn;
		/** DisplAys the vAlues of pArAmeters for the stAck frAme. */
		pArAmeterVAlues?: booleAn;
		/** DisplAys the line number of the stAck frAme. */
		line?: booleAn;
		/** DisplAys the module of the stAck frAme. */
		module?: booleAn;
		/** Includes All stAck frAmes, including those the debug AdApter might otherwise hide. */
		includeAll?: booleAn;
	}

	/** An ExceptionOptions Assigns configurAtion options to A set of exceptions. */
	export interfAce ExceptionOptions {
		/** A pAth thAt selects A single or multiple exceptions in A tree. If 'pAth' is missing, the whole tree is selected.
			By convention the first segment of the pAth is A cAtegory thAt is used to group exceptions in the UI.
		*/
		pAth?: ExceptionPAthSegment[];
		/** Condition when A thrown exception should result in A breAk. */
		breAkMode: ExceptionBreAkMode;
	}

	/** This enumerAtion defines All possible conditions when A thrown exception should result in A breAk.
		never: never breAks,
		AlwAys: AlwAys breAks,
		unhAndled: breAks when exception unhAndled,
		userUnhAndled: breAks if the exception is not hAndled by user code.
	*/
	export type ExceptionBreAkMode = 'never' | 'AlwAys' | 'unhAndled' | 'userUnhAndled';

	/** An ExceptionPAthSegment represents A segment in A pAth thAt is used to mAtch leAfs or nodes in A tree of exceptions.
		If A segment consists of more thAn one nAme, it mAtches the nAmes provided if 'negAte' is fAlse or missing or
		it mAtches Anything except the nAmes provided if 'negAte' is true.
	*/
	export interfAce ExceptionPAthSegment {
		/** If fAlse or missing this segment mAtches the nAmes provided, otherwise it mAtches Anything except the nAmes provided. */
		negAte?: booleAn;
		/** Depending on the vAlue of 'negAte' the nAmes thAt should mAtch or not mAtch. */
		nAmes: string[];
	}

	/** DetAiled informAtion About An exception thAt hAs occurred. */
	export interfAce ExceptionDetAils {
		/** MessAge contAined in the exception. */
		messAge?: string;
		/** Short type nAme of the exception object. */
		typeNAme?: string;
		/** Fully-quAlified type nAme of the exception object. */
		fullTypeNAme?: string;
		/** OptionAl expression thAt cAn be evAluAted in the current scope to obtAin the exception object. */
		evAluAteNAme?: string;
		/** StAck trAce At the time the exception wAs thrown. */
		stAckTrAce?: string;
		/** DetAils of the exception contAined by this exception, if Any. */
		innerException?: ExceptionDetAils[];
	}

	/** Represents A single disAssembled instruction. */
	export interfAce DisAssembledInstruction {
		/** The Address of the instruction. TreAted As A hex vAlue if prefixed with '0x', or As A decimAl vAlue otherwise. */
		Address: string;
		/** OptionAl rAw bytes representing the instruction And its operAnds, in An implementAtion-defined formAt. */
		instructionBytes?: string;
		/** Text representing the instruction And its operAnds, in An implementAtion-defined formAt. */
		instruction: string;
		/** NAme of the symbol thAt corresponds with the locAtion of this instruction, if Any. */
		symbol?: string;
		/** Source locAtion thAt corresponds to this instruction, if Any.
			Should AlwAys be set (if AvAilAble) on the first instruction returned,
			but cAn be omitted AfterwArds if this instruction mAps to the sAme source file As the previous instruction.
		*/
		locAtion?: Source;
		/** The line within the source locAtion thAt corresponds to this instruction, if Any. */
		line?: number;
		/** The column within the line thAt corresponds to this instruction, if Any. */
		column?: number;
		/** The end line of the rAnge thAt corresponds to this instruction, if Any. */
		endLine?: number;
		/** The end column of the rAnge thAt corresponds to this instruction, if Any. */
		endColumn?: number;
	}

	/** LogicAl AreAs thAt cAn be invAlidAted by the 'invAlidAted' event.
		'All': All previously fetched dAtA hAs become invAlid And needs to be refetched.
		'stAcks': Previously fetched stAck relAted dAtA hAs become invAlid And needs to be refetched.
		'threAds': Previously fetched threAd relAted dAtA hAs become invAlid And needs to be refetched.
		'vAriAbles': Previously fetched vAriAble dAtA hAs become invAlid And needs to be refetched.
	*/
	export type InvAlidAtedAreAs = 'All' | 'stAcks' | 'threAds' | 'vAriAbles';
}

