// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cached_pos_config.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetCachedPosConfigCollection on Isar {
  IsarCollection<CachedPosConfig> get cachedPosConfigs => this.collection();
}

const CachedPosConfigSchema = CollectionSchema(
  name: r'CachedPosConfig',
  id: -4851454756748122146,
  properties: {
    r'cachedAt': PropertySchema(
      id: 0,
      name: r'cachedAt',
      type: IsarType.dateTime,
    ),
    r'currency': PropertySchema(
      id: 1,
      name: r'currency',
      type: IsarType.string,
    ),
    r'outletId': PropertySchema(
      id: 2,
      name: r'outletId',
      type: IsarType.string,
    ),
    r'printReceiptAuto': PropertySchema(
      id: 3,
      name: r'printReceiptAuto',
      type: IsarType.bool,
    ),
    r'receiptFooter': PropertySchema(
      id: 4,
      name: r'receiptFooter',
      type: IsarType.string,
    ),
    r'receiptWhatsAppTemplate': PropertySchema(
      id: 5,
      name: r'receiptWhatsAppTemplate',
      type: IsarType.string,
    ),
    r'serviceChargeRate': PropertySchema(
      id: 6,
      name: r'serviceChargeRate',
      type: IsarType.double,
    ),
    r'taxRate': PropertySchema(
      id: 7,
      name: r'taxRate',
      type: IsarType.double,
    )
  },
  estimateSize: _cachedPosConfigEstimateSize,
  serialize: _cachedPosConfigSerialize,
  deserialize: _cachedPosConfigDeserialize,
  deserializeProp: _cachedPosConfigDeserializeProp,
  idName: r'id',
  indexes: {
    r'outletId': IndexSchema(
      id: -1197630030247531768,
      name: r'outletId',
      unique: true,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'outletId',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    )
  },
  links: {},
  embeddedSchemas: {},
  getId: _cachedPosConfigGetId,
  getLinks: _cachedPosConfigGetLinks,
  attach: _cachedPosConfigAttach,
  version: '3.1.0+1',
);

int _cachedPosConfigEstimateSize(
  CachedPosConfig object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.currency.length * 3;
  bytesCount += 3 + object.outletId.length * 3;
  {
    final value = object.receiptFooter;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  {
    final value = object.receiptWhatsAppTemplate;
    if (value != null) {
      bytesCount += 3 + value.length * 3;
    }
  }
  return bytesCount;
}

void _cachedPosConfigSerialize(
  CachedPosConfig object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeDateTime(offsets[0], object.cachedAt);
  writer.writeString(offsets[1], object.currency);
  writer.writeString(offsets[2], object.outletId);
  writer.writeBool(offsets[3], object.printReceiptAuto);
  writer.writeString(offsets[4], object.receiptFooter);
  writer.writeString(offsets[5], object.receiptWhatsAppTemplate);
  writer.writeDouble(offsets[6], object.serviceChargeRate);
  writer.writeDouble(offsets[7], object.taxRate);
}

CachedPosConfig _cachedPosConfigDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = CachedPosConfig();
  object.cachedAt = reader.readDateTime(offsets[0]);
  object.currency = reader.readString(offsets[1]);
  object.id = id;
  object.outletId = reader.readString(offsets[2]);
  object.printReceiptAuto = reader.readBool(offsets[3]);
  object.receiptFooter = reader.readStringOrNull(offsets[4]);
  object.receiptWhatsAppTemplate = reader.readStringOrNull(offsets[5]);
  object.serviceChargeRate = reader.readDouble(offsets[6]);
  object.taxRate = reader.readDouble(offsets[7]);
  return object;
}

P _cachedPosConfigDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readDateTime(offset)) as P;
    case 1:
      return (reader.readString(offset)) as P;
    case 2:
      return (reader.readString(offset)) as P;
    case 3:
      return (reader.readBool(offset)) as P;
    case 4:
      return (reader.readStringOrNull(offset)) as P;
    case 5:
      return (reader.readStringOrNull(offset)) as P;
    case 6:
      return (reader.readDouble(offset)) as P;
    case 7:
      return (reader.readDouble(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _cachedPosConfigGetId(CachedPosConfig object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _cachedPosConfigGetLinks(CachedPosConfig object) {
  return [];
}

void _cachedPosConfigAttach(
    IsarCollection<dynamic> col, Id id, CachedPosConfig object) {
  object.id = id;
}

extension CachedPosConfigByIndex on IsarCollection<CachedPosConfig> {
  Future<CachedPosConfig?> getByOutletId(String outletId) {
    return getByIndex(r'outletId', [outletId]);
  }

  CachedPosConfig? getByOutletIdSync(String outletId) {
    return getByIndexSync(r'outletId', [outletId]);
  }

  Future<bool> deleteByOutletId(String outletId) {
    return deleteByIndex(r'outletId', [outletId]);
  }

  bool deleteByOutletIdSync(String outletId) {
    return deleteByIndexSync(r'outletId', [outletId]);
  }

  Future<List<CachedPosConfig?>> getAllByOutletId(List<String> outletIdValues) {
    final values = outletIdValues.map((e) => [e]).toList();
    return getAllByIndex(r'outletId', values);
  }

  List<CachedPosConfig?> getAllByOutletIdSync(List<String> outletIdValues) {
    final values = outletIdValues.map((e) => [e]).toList();
    return getAllByIndexSync(r'outletId', values);
  }

  Future<int> deleteAllByOutletId(List<String> outletIdValues) {
    final values = outletIdValues.map((e) => [e]).toList();
    return deleteAllByIndex(r'outletId', values);
  }

  int deleteAllByOutletIdSync(List<String> outletIdValues) {
    final values = outletIdValues.map((e) => [e]).toList();
    return deleteAllByIndexSync(r'outletId', values);
  }

  Future<Id> putByOutletId(CachedPosConfig object) {
    return putByIndex(r'outletId', object);
  }

  Id putByOutletIdSync(CachedPosConfig object, {bool saveLinks = true}) {
    return putByIndexSync(r'outletId', object, saveLinks: saveLinks);
  }

  Future<List<Id>> putAllByOutletId(List<CachedPosConfig> objects) {
    return putAllByIndex(r'outletId', objects);
  }

  List<Id> putAllByOutletIdSync(List<CachedPosConfig> objects,
      {bool saveLinks = true}) {
    return putAllByIndexSync(r'outletId', objects, saveLinks: saveLinks);
  }
}

extension CachedPosConfigQueryWhereSort
    on QueryBuilder<CachedPosConfig, CachedPosConfig, QWhere> {
  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }
}

extension CachedPosConfigQueryWhere
    on QueryBuilder<CachedPosConfig, CachedPosConfig, QWhereClause> {
  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterWhereClause> idEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterWhereClause>
      idNotEqualTo(Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterWhereClause>
      idGreaterThan(Id id, {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterWhereClause> idLessThan(
      Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterWhereClause> idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterWhereClause>
      outletIdEqualTo(String outletId) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'outletId',
        value: [outletId],
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterWhereClause>
      outletIdNotEqualTo(String outletId) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'outletId',
              lower: [],
              upper: [outletId],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'outletId',
              lower: [outletId],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'outletId',
              lower: [outletId],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'outletId',
              lower: [],
              upper: [outletId],
              includeUpper: false,
            ));
      }
    });
  }
}

extension CachedPosConfigQueryFilter
    on QueryBuilder<CachedPosConfig, CachedPosConfig, QFilterCondition> {
  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      cachedAtEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'cachedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      cachedAtGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'cachedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      cachedAtLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'cachedAt',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      cachedAtBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'cachedAt',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      currencyEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'currency',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      currencyGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'currency',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      currencyLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'currency',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      currencyBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'currency',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      currencyStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'currency',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      currencyEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'currency',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      currencyContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'currency',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      currencyMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'currency',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      currencyIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'currency',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      currencyIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'currency',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      idEqualTo(Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      outletIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'outletId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      outletIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'outletId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      outletIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'outletId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      outletIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'outletId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      outletIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'outletId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      outletIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'outletId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      outletIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'outletId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      outletIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'outletId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      outletIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'outletId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      outletIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'outletId',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      printReceiptAutoEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'printReceiptAuto',
        value: value,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptFooterIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'receiptFooter',
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptFooterIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'receiptFooter',
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptFooterEqualTo(
    String? value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'receiptFooter',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptFooterGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'receiptFooter',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptFooterLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'receiptFooter',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptFooterBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'receiptFooter',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptFooterStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'receiptFooter',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptFooterEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'receiptFooter',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptFooterContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'receiptFooter',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptFooterMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'receiptFooter',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptFooterIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'receiptFooter',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptFooterIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'receiptFooter',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptWhatsAppTemplateIsNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNull(
        property: r'receiptWhatsAppTemplate',
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptWhatsAppTemplateIsNotNull() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(const FilterCondition.isNotNull(
        property: r'receiptWhatsAppTemplate',
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptWhatsAppTemplateEqualTo(
    String? value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'receiptWhatsAppTemplate',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptWhatsAppTemplateGreaterThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'receiptWhatsAppTemplate',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptWhatsAppTemplateLessThan(
    String? value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'receiptWhatsAppTemplate',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptWhatsAppTemplateBetween(
    String? lower,
    String? upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'receiptWhatsAppTemplate',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptWhatsAppTemplateStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'receiptWhatsAppTemplate',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptWhatsAppTemplateEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'receiptWhatsAppTemplate',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptWhatsAppTemplateContains(String value,
          {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'receiptWhatsAppTemplate',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptWhatsAppTemplateMatches(String pattern,
          {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'receiptWhatsAppTemplate',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptWhatsAppTemplateIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'receiptWhatsAppTemplate',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      receiptWhatsAppTemplateIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'receiptWhatsAppTemplate',
        value: '',
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      serviceChargeRateEqualTo(
    double value, {
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'serviceChargeRate',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      serviceChargeRateGreaterThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'serviceChargeRate',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      serviceChargeRateLessThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'serviceChargeRate',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      serviceChargeRateBetween(
    double lower,
    double upper, {
    bool includeLower = true,
    bool includeUpper = true,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'serviceChargeRate',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      taxRateEqualTo(
    double value, {
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'taxRate',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      taxRateGreaterThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'taxRate',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      taxRateLessThan(
    double value, {
    bool include = false,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'taxRate',
        value: value,
        epsilon: epsilon,
      ));
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterFilterCondition>
      taxRateBetween(
    double lower,
    double upper, {
    bool includeLower = true,
    bool includeUpper = true,
    double epsilon = Query.epsilon,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'taxRate',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        epsilon: epsilon,
      ));
    });
  }
}

extension CachedPosConfigQueryObject
    on QueryBuilder<CachedPosConfig, CachedPosConfig, QFilterCondition> {}

extension CachedPosConfigQueryLinks
    on QueryBuilder<CachedPosConfig, CachedPosConfig, QFilterCondition> {}

extension CachedPosConfigQuerySortBy
    on QueryBuilder<CachedPosConfig, CachedPosConfig, QSortBy> {
  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByCachedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'cachedAt', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByCachedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'cachedAt', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByCurrency() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'currency', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByCurrencyDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'currency', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByOutletId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'outletId', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByOutletIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'outletId', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByPrintReceiptAuto() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'printReceiptAuto', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByPrintReceiptAutoDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'printReceiptAuto', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByReceiptFooter() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'receiptFooter', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByReceiptFooterDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'receiptFooter', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByReceiptWhatsAppTemplate() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'receiptWhatsAppTemplate', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByReceiptWhatsAppTemplateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'receiptWhatsAppTemplate', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByServiceChargeRate() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'serviceChargeRate', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByServiceChargeRateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'serviceChargeRate', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy> sortByTaxRate() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'taxRate', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      sortByTaxRateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'taxRate', Sort.desc);
    });
  }
}

extension CachedPosConfigQuerySortThenBy
    on QueryBuilder<CachedPosConfig, CachedPosConfig, QSortThenBy> {
  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByCachedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'cachedAt', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByCachedAtDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'cachedAt', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByCurrency() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'currency', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByCurrencyDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'currency', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy> thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByOutletId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'outletId', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByOutletIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'outletId', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByPrintReceiptAuto() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'printReceiptAuto', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByPrintReceiptAutoDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'printReceiptAuto', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByReceiptFooter() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'receiptFooter', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByReceiptFooterDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'receiptFooter', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByReceiptWhatsAppTemplate() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'receiptWhatsAppTemplate', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByReceiptWhatsAppTemplateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'receiptWhatsAppTemplate', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByServiceChargeRate() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'serviceChargeRate', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByServiceChargeRateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'serviceChargeRate', Sort.desc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy> thenByTaxRate() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'taxRate', Sort.asc);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QAfterSortBy>
      thenByTaxRateDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'taxRate', Sort.desc);
    });
  }
}

extension CachedPosConfigQueryWhereDistinct
    on QueryBuilder<CachedPosConfig, CachedPosConfig, QDistinct> {
  QueryBuilder<CachedPosConfig, CachedPosConfig, QDistinct>
      distinctByCachedAt() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'cachedAt');
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QDistinct> distinctByCurrency(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'currency', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QDistinct> distinctByOutletId(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'outletId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QDistinct>
      distinctByPrintReceiptAuto() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'printReceiptAuto');
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QDistinct>
      distinctByReceiptFooter({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'receiptFooter',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QDistinct>
      distinctByReceiptWhatsAppTemplate({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'receiptWhatsAppTemplate',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QDistinct>
      distinctByServiceChargeRate() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'serviceChargeRate');
    });
  }

  QueryBuilder<CachedPosConfig, CachedPosConfig, QDistinct>
      distinctByTaxRate() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'taxRate');
    });
  }
}

extension CachedPosConfigQueryProperty
    on QueryBuilder<CachedPosConfig, CachedPosConfig, QQueryProperty> {
  QueryBuilder<CachedPosConfig, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<CachedPosConfig, DateTime, QQueryOperations> cachedAtProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'cachedAt');
    });
  }

  QueryBuilder<CachedPosConfig, String, QQueryOperations> currencyProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'currency');
    });
  }

  QueryBuilder<CachedPosConfig, String, QQueryOperations> outletIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'outletId');
    });
  }

  QueryBuilder<CachedPosConfig, bool, QQueryOperations>
      printReceiptAutoProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'printReceiptAuto');
    });
  }

  QueryBuilder<CachedPosConfig, String?, QQueryOperations>
      receiptFooterProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'receiptFooter');
    });
  }

  QueryBuilder<CachedPosConfig, String?, QQueryOperations>
      receiptWhatsAppTemplateProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'receiptWhatsAppTemplate');
    });
  }

  QueryBuilder<CachedPosConfig, double, QQueryOperations>
      serviceChargeRateProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'serviceChargeRate');
    });
  }

  QueryBuilder<CachedPosConfig, double, QQueryOperations> taxRateProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'taxRate');
    });
  }
}
