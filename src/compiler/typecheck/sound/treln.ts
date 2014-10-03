// Modified by N.Swamy, A.Rastogi (2014)
///<reference path='../../references.ts' />
///<reference path='tcEnv.ts' />
module TypeScript {
    export module TypeRelations {
        var zero: TcUtil.Delta = undefined;
        var fail : Pair<boolean, TcUtil.Delta> = { fst: false, snd: <TcUtil.Delta>undefined };
        var success = (delta: TcUtil.Delta) => pair(true, delta);
        export interface Cycles extends Array<Pair<NamedType, NamedType>> { }

        function toStructuredType(t1: SoundType): StructuredType {
            t1 = t1.unfold();
            if (t1 instanceof NamedType) {
                return (<NamedType>t1).toRecord();
            }
            if (t1 instanceof StructuredType) {
                return <StructuredType>t1;
            }
            return;
        }
        function missingOptionalFields(t1: SoundType, t2: SoundType): boolean {
            var r1 = toStructuredType(t1);
            var r2 = toStructuredType(t2);
            if (r1 && r2) {
                var f1 = r1.exposeFields();
                var f2 = r2.exposeFields();
                return f2.every((f) => f.optional || f1.some((g) => g.name === f.name));
            }
            return false;
        }
        export function assignable(t1: SoundType, t2: SoundType): boolean {
            return (t1.unFree() && (!t1.isUn()) && t2.typeName === TypeName.Any)
                || (!t1.isVirtual() && missingOptionalFields(t2, t1))
                || t1.equals(t2);
        };
        function typeEquality(t1: SoundType, t2: SoundType, cycles: Cycles, debug?:any): boolean {
            if (t1.equals(t2)) return true;
            t1 = t1.unfold(); t2 = t2.unfold();
            if (TcUtil.isArray(t1) && TcUtil.isArray(t2)) {
                return typeEquality(TcUtil.arrayElementType(t1), TcUtil.arrayElementType(t2), cycles, debug);
            }
            switch (t1.typeName) {
                case TypeName.UVar:
                    var u = <TUVar>t1;
                    if (u.isResolved()) {
                        return typeEquality(u.unfold(), t2, cycles, debug);
                    }
                    else {
                        u.resolve(t2);
                        return true;
                    }
                case TypeName.IndexMap:
                    if (t2.typeName === TypeName.IndexMap) {
                        var i1 = <TIndexMap>t1;
                        var i2 = <TIndexMap>t2;
                        return typeEquality(i1.elt, i2.elt, cycles, debug) && typeEquality(i1.indexType, i2.indexType, cycles, debug);
                    }
                    return false;
                case TypeName.Interface:
                    if (t2.typeName === TypeName.Record) {
                        return typeEquality((<TInterface>t1).toRecord(), t2, cycles, debug);
                    }
                    if (t2.typeName === TypeName.Interface) { //TODO: extend cycles?
                        return typeEquality((<TInterface>t1).toRecord(), (<TInterface>t2).toRecord(), cycles, debug);
                    }
                    return false;    

                case TypeName.Record:
                    if (t2.typeName === TypeName.Interface) {
                        return typeEquality(t1, (<TInterface>t2).toRecord(), cycles, debug);
                    }
                    return false;    

                default:
                    return false;
            }
            return false;
        };
        function deepArrayOrMapSubtyping(t1: SoundType, t2: SoundType, fc: TcUtil.fc, cycles: Cycles, debug?: any): boolean {
            var sub: (t1: SoundType, t2: SoundType, fc?: TcUtil.fc, cycles?:Cycles, debug?:any) => boolean = fc.captureFree ? isSubtype : subtypeZ;
            if (TcUtil.isArray(t1) && TcUtil.isArray(t2)) {
                return sub(TcUtil.arrayElementType(<TInst>t1), TcUtil.arrayElementType(<TInst>t2), fc, cycles, debug);
            }
            else if (t1.typeName === TypeName.IndexMap
                && t2.typeName === TypeName.IndexMap) {
                var i1 = <TIndexMap>t1;
                var i2 = <TIndexMap>t2;
                    return sub(i2.indexType, i1.indexType, fc, cycles, debug)
                        && sub(i1.elt, i2.elt, fc, cycles, debug);
            }
            return false;
        }
        function arrowSubtyping(a1: TArrow, a2: TArrow, cycles: Cycles, debug?:any): boolean {
            for (var i = 0; i < a1.args.length; i++) {
                if (i >= a2.args.length) {
                    if (!a1.args[i].optional()) {
                        return false;
                    } else {
                        continue;
                    }
                }
                if (a2.args[i].variadic && !a1.args[i].variadic) {
                    if (!a1.args[i].optional()) {
                        return false;
                    }
                    var elt_t = a2.args[i].type.unfold();
                    if (!elt_t.isArray() || !subtypeZ((<TInterface>elt_t).arrayElementType(), a1.args[i].type, TcUtil.fcNeither, cycles, debug)) {
                        return false;
                    }
                }
                else if (!subtypeZ(a2.args[i].type, a1.args[i].type, TcUtil.fcNeither, cycles, debug)) {
                    return false;
                }
            }
            return subtypeZ(a1.result, a2.result, TcUtil.fcNeither, cycles, debug);
        }
        function recordSubtyping(t1: TRecord, t2: TRecord, fc:TcUtil.fc, cycles: Pair<NamedType, NamedType>[]= [], debug?:any): Pair<boolean, TcUtil.Delta> {
            var r1 = <TRecord> t1;
            var r2 = <TRecord> t2;
            var isDefaultIndexSignature = (f: Field, f1s: MethodOrField[], fc: TcUtil.fc) => {
                var sub: (t1: SoundType, t2: SoundType, fc?: TcUtil.fc, cycles?: Cycles, debug?: any) => boolean = fc.captureFree ? isSubtype : subtypeZ;
                if (f.type.typeName === TypeName.IndexMap
                    && (<TIndexMap>f.type).indexType.typeName === TypeName.String) {
                    return f1s.every((f1) => sub(f1.type, (<TIndexMap>f.type).elt, fc, cycles, debug));
                }
                return false;
            };
            var checkInclusion = (f1s: MethodOrField[], f2s: MethodOrField[], isField: boolean): { fst: boolean; snd: MethodOrField[] } => {
                var difference : MethodOrField[] = [];
                var res = f2s.every((f2) => {
                    var matches = f1s.filter((f1) => f1.name === f2.name);
                    if (matches.length >= 1) { //NS: could be possible because of overloading ... FIXME
                        var f1 = matches[0];
                        if (isField) {
                            if (f1.optional && !f2.optional) return false;
                            if (f1.mutable !== f2.mutable) return false;
                            if (!f1.mutable || fc.captureFree) {
                                return isSubtype(f1.type, f2.type, fc, cycles, debug);
                            }
                            if (fc.fresh) {
                                return subtypeZ(f1.type, f2.type, fc, cycles, debug);
                            }
                            return typeEquality(f1.type, f2.type, cycles, debug);
                        } else {   //methods
                            if (typeEquality(f1.type, f2.type, cycles, debug)) {
                                return true;
                            }
                            else if (f1.type.typeName === TypeName.Arrow
                                && f2.type.typeName === TypeName.Arrow
                                && arrowSubtyping(<TArrow>f1.type, <TArrow>f2.type, cycles, debug)) {
                                difference.push(f1);
                                return true;
                            }  //for non-arrow method types (e.g., poly types) only equality applies
                            return false;
                        }
                    } else {
                        return f2.optional && fc.fresh;
                    }
                });
                f1s.forEach((f1) => {
                    if (!f2s.some((f2) => f2.name === f1.name)) {
                        difference.push(f1);
                    }
                });
                return { fst: res, snd: difference };
            };
            if (fc.fresh || fc.captureFree) {
                var f2 = r2.exposeFields().filter((f2) => f2.type.typeName === TypeName.IndexMap);
                if (f2.length === 1
                    && isDefaultIndexSignature(f2[0], r1.exposeFields(), fc)
                    && r1.exposeMethods().length === 0
                    && r2.exposeMethods().length === 0) {
                    return success(zero);
                }
            }
            var result = checkInclusion(r1.exposeFields(), r2.exposeFields(), true);
            if (!result.fst) return fail;
            var df = result.snd;
            result = checkInclusion(r1.exposeMethods(), r2.exposeMethods(), false);
            if (!result.fst) return fail;
            var dm = result.snd;
            var delta = (df.length === 0 && dm.length === 0) || (SoundTypeChecker.compilationSettings.tsstarTagging()) ? zero : new TRecord(df, dm); //AR
            return success(delta);
        }
        export function subtypeZ(t1: SoundType, t2: SoundType, fc:TcUtil.fc=TcUtil.fcNeither, cycles: Cycles=[], debug?:any) {
            var r = subtype(t1, t2, fc, cycles, debug);
            return r.fst && !r.snd;
        }
        export function isSubtype(t1: SoundType, t2: SoundType, fc:TcUtil.fc=TcUtil.fcNeither, cycles: Cycles=[], debug?:any) {
            return subtype(t1, t2, fc, cycles, debug).fst;
        }
        export function subTypeOrSig(t1: SoundType, t2: SoundType, fc:TcUtil.fc, cycles: Cycles= [], debug?: any) {
            if (t1.typeName === TypeName.Arrow && t2.typeName === TypeName.Arrow) {
                if (arrowSubtyping(<TArrow>t1, <TArrow>t2, cycles, debug)) {
                    return success(zero);
                }
                return fail;
            } else if (t1.typeName !== TypeName.Arrow && t2.typeName !== TypeName.Arrow) {
                return subtype(t1, t2, fc, cycles, debug);
            } else if (t1.typeName == TypeName.Arrow) {
                return subtype(functionType(t1), t2, fc, cycles, debug);
            } else {
                return subtype(t1, functionType(t2), fc, cycles, debug);
            }
        }
        //AR: for TS* tagging scheme, delta is always zero, except arrays that are still lazy tagged (t[] <: any ~> t[])
        export function subtype(t1: SoundType, t2: SoundType, fc: TcUtil.fc= TcUtil.fcNeither, cycles: Pair<NamedType, NamedType>[]= [], debug?: any): Pair<boolean, TcUtil.Delta> {
            var log = (msg: string) => {
                if (debug) console.log(msg);
            };
            var tag = (t: SoundType) => (a: AST) => {
                var res = MkAST.callExpr(MkAST.fieldOfRT("tagValue"), [a, t.toRTTI()]);
                res.soundType = t;
                return res;
            };
            var inHierarchy: (t: SoundType, h: SoundType[]) => boolean = (t, h) => {
                return h.some((s: SoundType) => {
                    if (typeEquality(s, t, cycles, debug)) return true;
                    var ss = s.unfold();
                    if (ss instanceof NamedType) {
                        return (t.typeName === TypeName.Interface && inHierarchy(t, (<NamedType>ss).implementsI))
                            || inHierarchy(t, (<NamedType>ss).extendsC);
                    }
                    return false;
                });
            };
            if (!t1 || !t2) return fail;
            if (t1.isVirtual() && !t2.isVirtual()) return fail; //cannot strip off the dot
            if (t1.equals(t2)
                || cycles.some((s1s2) => s1s2.fst.equals(t1) && s1s2.snd.equals(t2))) {      //S-Refl
                return success(zero);
            }
            if (t1.isUn() || t2.isUn()) {
                return fail; // already checked for refl
            }
            if ((fc.captureFree && deepArrayOrMapSubtyping(t1, t2, fc, cycles, debug))
                || typeEquality(t1, t2, cycles, debug)) {
                    if (SoundTypeChecker.compilationSettings.tsstarTagging()
                        && TcUtil.isArray(t2) && TcUtil.isArray(t1) && TcUtil.arrayElementType(t1).typeName === TypeName.UVar) {
                        return success(t2);
                    }
                return success(zero);
            }
            //Already checked for equality
            t1 = t1.unfold(); t2 = t2.unfold();
            switch (t1.typeName) {
                case TypeName.UVar:
                    var u = <TUVar>t1;
                    if (u.isResolved()) {
                        return subtype(u.unfold(), t2, fc, cycles, debug);
                    }
                    else {
                        u.resolve(t2);
                        return success(zero);
                    }

                case TypeName.Null:
                    if (SoundTypeChecker.compilationSettings.relaxNullChecks()) {
                        return success(zero);
                    } else {
                        if (t2.typeName === TypeName.Any) return success(zero);
                        return fail;
                    }
                
                case TypeName.Void:
                    return success(zero);

                case TypeName.Variable:
                    if (t1.typeName === t2.typeName || t2.typeName === TypeName.Any) {
                        return success(zero);
                    }

                    var cons = t1.getConstraint();
                    return (cons ? subtype(cons, t2, fc, cycles, debug) : fail);
                    
                case TypeName.String:
                case TypeName.Bool:
                    switch (t2.typeName) {
                        case TypeName.Any: //S-PCAny
                            return success(zero);

                        default: 
                            return fail;
                    }

                case TypeName.Number:
                    switch (t2.typeName) {
                        case TypeName.Enum:
                        case TypeName.Any: //S-PCAny
                            return success(zero);

                        default:
                            return fail;
                    }

                case TypeName.Record:
                    switch (t2.typeName) {
                        case TypeName.Any: //S-Any
                            if (t1.unFree()) {
                                if (SoundTypeChecker.compilationSettings.tsstarTagging()) {
                                    return success(zero);
                                } else {
                                    return success(t1);
                                }
                            }
                            return fail;

                        case TypeName.Record: //S-Rec
                            return recordSubtyping(<TRecord>t1, <TRecord>t2, fc, cycles, debug);

                        case TypeName.Interface: //S-StructI
                            if (t2.isNominal()) {
                                return fail;
                            }
                            return subtype(t1, (<TInterface>t2).toRecord(), fc, cycles, debug);

                        case TypeName.Just: //S-Dot (partially)
                            return subtype(t1, (<JustType>t2).repr, fc, cycles, debug);

                        case TypeName.Arrow:
                            throw new Error("Impossible: Arrow types should never be outside a structure");

                        default: return fail;
                    }
                
                case TypeName.Interface: 
                    if (t2.typeName === TypeName.Any && t1.unFree() && !t1.isVirtual()) { //S-Any
                        if (t1.isNominal()) {
                            return success(zero);
                        }
                        if (SoundTypeChecker.compilationSettings.tsstarTagging()) { //AR: if it's an array, return delta even in TS* case
                            if (t1.isArray()) {
                                return success(t1);
                            } else {
                                return success(zero);
                            }
                        } else {
                            return success(t1);
                        }
                    } else if (t2 instanceof NamedType && inHierarchy(t2, (<TInterface>t1).extendsC)) {
                        if (t1.isNominal()) {
                            return success(zero);
                        }
                        if (SoundTypeChecker.compilationSettings.tsstarTagging()) {
                            return success(zero); //AR: here t1 cannot be an array
                        } else {
                            return success(t1);
                        }
                    } else {
                        switch (t2.typeName) {
                            case TypeName.Interface: //S-IJ
                                if (t1.isArray() && t2.isCheckedArray()) {
                                    var e1 = (<TInterface>t1).arrayElementType();
                                    var e2 = (<TInterface>t2).arrayElementType();
                                    if (isSubtype(e1, e2, fc, cycles, debug)) {
                                        return success(t1); //AR: array case, leave as is
                                    } else {
                                        return fail;
                                    }
                                } else if (!t2.isNominal()) {
                                    var res = subtype((<TInterface>t1).toRecord(), t2, fc, cycles.concat([pair(<NamedType>t1, <NamedType>t2)]), debug);
                                    if (res.fst && !SoundTypeChecker.compilationSettings.tsstarTagging()) {
                                        res.snd = t1;
                                    }
                                    if (res.fst && t1.isNominal()) {
                                        return success(zero);
                                    }
                                    return res;
                                } else {
                                    return fail;
                                }
                            case TypeName.Record:   //S-IStruct
                                var res = subtype((<TInterface>t1).toRecord(), t2, fc, cycles, debug);
                                if (res.fst && !SoundTypeChecker.compilationSettings.tsstarTagging()) {
                                    if (t1.isNominal()) {
                                        res.snd = zero;
                                    } else {
                                        res.snd = t1;
                                    }
                                }
                                return res;

                            case TypeName.Just:     //S-Dot
                                if (isSubtype(t1, (<JustType>t2).repr, fc, cycles, debug)) {
                                    return success(zero);
                                }
                                return fail;

                            default:
                                return fail;
                        }
                    }

                case TypeName.Object:
                    var o = <TObject>t1;
                    if (t2.typeName === TypeName.Any && t1.unFree()) { //S-Any
                        return success(zero);
                    } else if (t2.typeName === TypeName.Object && inHierarchy(t2, o.extendsC)) { //S-Class
                        return success(zero);
                    } else {
                        switch (t2.typeName) {
                            case TypeName.Interface: //S-CI
                                if (inHierarchy(t2, o.implementsI) || o.extendsC.some((t) => isSubtype(t, t2, fc, cycles, debug))) {
                                    return success(zero);
                                }
                                else if (isSubtype((<NamedType>t1).toRecord(), (<NamedType>t2).toRecord(),
                                    fc, cycles.concat([pair(<NamedType>t1, <NamedType>t2)]), debug)) {
                                    return success(zero);
                                }
                                return fail;
                            case TypeName.Record:   //S-CStruct
                                if (isSubtype((<NamedType>t1).toRecord(), t2, fc, cycles, debug)) {
                                    return success(zero);
                                }
                                return fail;
                            case TypeName.Just: //S-Dot
                                if (isSubtype(t1, (<JustType>t2).repr, fc, cycles, debug)) {
                                    return success(zero);
                                }
                                return fail;
                            default:
                                return fail;
                        }
                    }

                case TypeName.Just:
                    var undotSubtype = (t1: JustType, t2: SoundType) => {
                        if (t2.typeName === TypeName.Just) {
                            t2 = (<JustType>t2).repr;
                        }
                        if (isSubtype(t1.repr, t2, fc, cycles, debug)) {
                            return success(zero);
                        }
                        return fail;
                    };
                    switch ((<JustType>t1).repr.typeName) {
                        case TypeName.Bool:
                        case TypeName.Number:
                        case TypeName.String:
                        case TypeName.Void: //S-PrimDot
                            if (t2.equals((<JustType>t1).repr)) {
                                return success(zero);
                            }
                            if (t2.typeName === TypeName.Any) {
                                return success(zero);
                            }
                            return undotSubtype(<JustType>t1, t2); //S-Dot
                        default:
                            return undotSubtype(<JustType>t1, t2); //S-Dot
                    }


                case TypeName.Class:
                    if (t2.typeName === TypeName.Any && t1.unFree()) {
                        return success(zero);
                    } else {
                        switch (t2.typeName) {
                            case TypeName.Interface:
                                return subtype((<TClass>t1).toRecord(), t2, fc, cycles.concat([pair(<NamedType>t1, <NamedType>t2)]), debug);

                            case TypeName.Record:
                                return subtype((<TClass>t1).toRecord(), t2, fc, cycles, debug);

                            case TypeName.Just: //S-Dot
                                if (isSubtype(t1, (<JustType>t2).repr, fc, cycles, debug)) {
                                    return success(zero);
                                }
                                return fail;

                            default:
                                return fail;
                        }
                    }

                case TypeName.Enum:
                    if (t2.typeName === TypeName.Number || t2.typeName === TypeName.Any) {
                        return success(zero);
                    } 
                    return fail;

                case TypeName.Poly:
                    var q1 = <TPoly>t1;
                    if (t2.typeName === TypeName.Poly) {
                        var q2 = <TPoly>t2;
                        if (q1.bvars.length === q2.bvars.length && q1.bvars.every((t, i) => t.equals(q2.bvars[i]))) {
                            if (isSubtype(q1.body, q2.body, fc, cycles, debug)) {
                                return success(zero);
                            }
                        }
                    }
                    return fail;

                case TypeName.Variable: //must be equal; no alpha conversion ... yet
                case TypeName.Module:  //Not allowing structural subtyping on a whole module
                case TypeName.IndexMap:
                case TypeName.Null:
                case TypeName.Un:
                case TypeName.Any: //already handled by type equality test
                    return fail;

                default: throw new Error("Unexpected type name t1 = " + t1 + ", t2 = " +t2+ ", :: debug= " +debug);
            }
        }
    };
}
