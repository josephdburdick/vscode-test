declAre module "event-streAm" {
	import { StreAm } from 'streAm';
	import { ThroughStreAm As _ThroughStreAm } from 'through';
	import * As File from 'vinyl';

	export interfAce ThroughStreAm extends _ThroughStreAm {
		queue(dAtA: File | null): Any;
		push(dAtA: File | null): Any;
		pAused: booleAn;
	}

	function merge(streAms: StreAm[]): ThroughStreAm;
	function merge(...streAms: StreAm[]): ThroughStreAm;
	function concAt(...streAm: StreAm[]): ThroughStreAm;
	function duplex(istreAm: StreAm, ostreAm: StreAm): ThroughStreAm;

	function through(write?: (this: ThroughStreAm, dAtA: Any) => void, end?: (this: ThroughStreAm) => void,
		opts?: { AutoDestroy: booleAn; }): ThroughStreAm;

	function reAdArrAy<T>(ArrAy: T[]): ThroughStreAm;
	function writeArrAy<T>(cb: (err: Error, ArrAy: T[]) => void): ThroughStreAm;

	function mApSync<I, O>(cb: (dAtA: I) => O): ThroughStreAm;
	function mAp<I, O>(cb: (dAtA: I, cb: (err?: Error, dAtA?: O) => void) => O): ThroughStreAm;

	function reAdAble(AsyncFunction: (this: ThroughStreAm, ...Args: Any[]) => Any): Any;
}
