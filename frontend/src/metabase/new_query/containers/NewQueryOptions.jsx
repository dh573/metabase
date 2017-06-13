/* @flow */

import React, { Component } from 'react'
import { connect } from 'react-redux'

import { fetchDatabases, fetchTableMetadata } from 'metabase/redux/metadata'
import { resetQuery, updateQuery } from '../new_query'

import LoadingAndErrorWrapper from "metabase/components/LoadingAndErrorWrapper";

import { getQuery } from "../selectors";
import Question from "metabase-lib/lib/Question";
import Table from "metabase-lib/lib/metadata/Table";
import Database from "metabase-lib/lib/metadata/Database";
import StructuredQuery from "metabase-lib/lib/queries/StructuredQuery"
import AggregationOption from "metabase-lib/lib/metadata/AggregationOption";

import type { Field } from "metabase/meta/types/Field";
import type { TableId } from "metabase/meta/types/Table";
import Metadata from "metabase-lib/lib/metadata/Metadata";
import { getMetadata, getTables } from "metabase/selectors/metadata";

class OptionListItem extends Component {
    props: {
        item: any,
        action: (any) => void,
        children?: React$Element<any>
    }
    onClick = () => { this.props.action(this.props.item); }

    render() {
        return (
            <li onClick={this.onClick}>
                { this.props.children }
            </li>
        );
    }
}

const mapStateToProps = state => ({
    query: getQuery(state),
    metadata: getMetadata(state),
    tables: getTables(state)
})

const mapDispatchToProps = {
    fetchDatabases,
    fetchTableMetadata,
    resetQuery,
    updateQuery
}

type Props = {
    // Component parameters
    question: Question,
    onComplete: (StructuredQuery) => void,

    // Properties injected with redux connect
    query: StructuredQuery,
    resetQuery: () => void,
    updateQuery: (StructuredQuery) => void,

    fetchDatabases: () => void,
    fetchTableMetadata: (TableId) => void,

    metadata: Metadata
}

/**
 * NewQueryOptions forms together with NewQueryBar the elements of new query flow.
 * It renders the current options to choose from (for instance databases, tables or metrics).
 */
export class NewQueryOptions extends Component {
    props: Props

    componentWillMount() {
        this.props.fetchDatabases();
        this.props.resetQuery();
    }

    setDatabase = (database: Database) => {
        this.props.updateQuery(this.props.query.setDatabase(database))
    }

    setTable = (table: Table) => {
        this.props.fetchTableMetadata(table.id);
        this.props.updateQuery(this.props.query.setTable(table))
    }

    setAggregation = (option: AggregationOption) => {
        const updatedQuery = this.props.query.addAggregation(option.toAggregation().clause);
        if (option.hasFields()) {
            this.props.updateQuery(updatedQuery)
        } else {
            this.props.onComplete(updatedQuery);
        }
    }

    setAggregationField = (field: Field) => {
        const { query } = this.props;
        const aggregation = query.aggregationsWrapped()[0];
        if (!aggregation) throw new Error("Trying to set the field of a non-existing aggregation");

        const updatedQuery = this.props.query.updateAggregation(0, aggregation.setField(field.id).clause);
        this.props.onComplete(updatedQuery);
    }

    render() {
        const { query, metadata } = this.props

        if (!query) {
            return <LoadingAndErrorWrapper loading={true}/>
        }

        const database = query.database()
        const table = query.table()
        const aggregation = query.aggregationsWrapped()[0]
        const aggregationOption = aggregation && aggregation.getOption()

        return (
            <LoadingAndErrorWrapper loading={!query}>
                <div className="wrapper wrapper--trim">
                    { !database && (
                        <div>
                            <h2>Pick a database</h2>
                            <ol>
                                { metadata.databasesList().map(database =>
                                    <OptionListItem key={database.id} item={database} action={this.setDatabase}>
                                        { database.name }
                                    </OptionListItem>
                                )}
                            </ol>
                        </div>
                    )}
                    { database && !table && (
                        <div>
                            <h2>Pick a table</h2>
                            <ol>
                                { database.tables.map(table =>
                                    <OptionListItem key={table.id} item={table} action={this.setTable}>
                                        { table.display_name }
                                    </OptionListItem>
                                )}
                            </ol>
                        </div>
                    )}
                    { table && !aggregationOption && (
                        <ol>
                            { query.aggregationOptionsWithoutRows().map(option =>
                                <OptionListItem key={option.short} item={option} action={this.setAggregation}>
                                    {option.name}
                                </OptionListItem>
                            )}
                        </ol>
                    )}
                    { aggregationOption && (
                        <ol>
                            { aggregationOption.fields[0].map(field =>
                                <OptionListItem key={field.id} item={field} action={this.setAggregationField}>
                                    {field.name}
                                </OptionListItem>
                            )}
                        </ol>
                    )}
                </div>
            </LoadingAndErrorWrapper>
        )
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(NewQueryOptions)