import React from 'react';
import axios from 'axios';

import styles from './Oer.module.css';

// Functional component for rendering each Resource
const OerItem = (props) => {

    return(
        <div className={styles.OerItem}>
            {/* The 'header' of the resource, when clicked it will open or close the dropdown */}
            <div className={styles.OerItemTop} onClick={props.onClick}>
            <h3>{props.oer.title.rendered}</h3>
                <div className={styles.Chevron} style={props.isOpen ? null : {transform: 'rotate(90deg)'}}><svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M504 256c0 137-111 248-248 248S8 393 8 256 119 8 256 8s248 111 248 248zM273 369.9l135.5-135.5c9.4-9.4 9.4-24.6 0-33.9l-17-17c-9.4-9.4-24.6-9.4-33.9 0L256 285.1 154.4 183.5c-9.4-9.4-24.6-9.4-33.9 0l-17 17c-9.4 9.4-9.4 24.6 0 33.9L239 369.9c9.4 9.4 24.6 9.4 34 0z"></path></svg></div>
            </div>

            {/* The dropdown part of the resource, shows resource meta data and the link to the resouce*/}
            <div className={props.isOpen ? `${styles.Info} ${styles.InfoOpen}` : styles.Info}>
                <div className={styles.Content}>
                    {
                        /* map through each property stored in this oer's meta and display it */
                         Object.keys(props.oer.meta).map(item => {
                             return(
                                <p key={item}><b>{item}:</b> {props.oer.meta[item].value}</p>
                             );
                         })
                    }
                </div>
                <div style={{textAlign: 'right'}}><a href={props.oer.link} title="Open this resource in a new tab" target='_BLANK' rel='noreferrer' className="Button">Open Resource</a></div>
            </div>
        </div>
    );
};

class Oer extends React.Component {

    // The REST endpoints of where to fetch the OER resources from. (Can be array)
    RESOURCE_ENDPOINTS = ['https://collection.bccampus.ca/wp-json/wp/v2/oer'];

    // The number of resources to display per page
    RESULTS_PER_PAGE = 12;

    // Array of network request cancel tokens, used to cancel ongoing requests when user changes pagination
    axiosCancelTokens = [];

    // Initial state
    state = {
        oers: [],
        open: null,
        loading: true,
        page: 1,
        total: 0
    }

    // When the component first mounts, make a call to the getResources function
    componentDidMount() {
        this.getResources();
    }

    // Function for fetching the resources from the specified endpoints
    getResources = () => {

        const findTaxonomyLink = (resource, taxonomy) => {
            return resource._links['wp:term'].find((term => (term.taxonomy === taxonomy)))?.href
        };

        // Start by settting loading to true, close any open resources, clear the resouces, and reset the total number of resources from state
        this.setState({loading: true, open: null, oers: [], total: 0});
        
        // cancel any existing network requests
        this.axiosCancelTokens.forEach(source => source.cancel());

        // get the number of resource endpoints
        let num_of_endoints = this.RESOURCE_ENDPOINTS.length;

        // Set the limit of the number of results to get from each endpoint 
        let num_results_to_fetch_per_endpoint = Math.floor(this.RESULTS_PER_PAGE / num_of_endoints);

        // Loop through each resource endpoint
        for(let i = 0; i < num_of_endoints; i++) {
            
            // if this is the last endpoint, then increase the number of results requested to ensure that we have 12 resources in total
            // TODO: -- would be great to change this logic to ensure a more even distribution of results per endpoint
            if(i === num_of_endoints - 1) num_results_to_fetch_per_endpoint = Math.floor(this.RESULTS_PER_PAGE / num_of_endoints) + this.RESULTS_PER_PAGE % num_of_endoints;
            
            // create a cancel token for this request and add it to the axiosCancelTokens array
            let cancelToken = axios.CancelToken.source();
            this.axiosCancelTokens.push(cancelToken);

            // Get the resource, passing in which page we want and how many results we want per page. Assign the requests its cancel token
            axios.get(`${this.RESOURCE_ENDPOINTS[i]}?page=${this.state.page}&per_page=${num_results_to_fetch_per_endpoint}`, { cancelToken: cancelToken.token})
                .then(response => {

                    // transform this data so we're not storing unessesary data in state.
                    let oers = response.data.map(oer => {
                        return {id: oer.id, title: oer.title, link: oer.link, meta: {Institutions: {url: findTaxonomyLink(oer, 'institutions'), value: null}, Authors: {url: findTaxonomyLink(oer, 'authors'), value: null}}}
                    });
       
                    // Add these OER resources to state.oer and increase state.total with the x-wp-total header.
                    this.setState((prevState) => {
                        return {oers: prevState.oers.concat(oers), total: prevState.total + Number(response.headers['x-wp-total']), loading: false};
                    });
                })
                .catch((e) => {
                    console.log(e);
                    if(!axios.isCancel(e)) this.setState({error: 'One or more resources failed to load', loading: false});
                });
        }
    }

    // Function for loading the next page. it increase state.page and calls this.getResources
    nextPage = () => {
        this.setState(prevState => ({page: prevState.page + 1}), this.getResources);
    }

    // Function for loading the previous page. it decreases state.page and calls this.getResources
    previousPage = () => {
        if(this.state.page > 1) this.setState(prevState => ({page: prevState.page - 1}), this.getResources);
    }

    // Handler for when a user clicks on a oer, it opens the drawer and loads additional data for that resource
    openResourceHandler = (index) => {
        // Open the drawer for this oer, unless it already is open, in which case close it
        this.setState(prevState => ({open: prevState.open === index ? null : index}));

        // Get the oer that was toggled from state
        let oer = this.state.oers[index];

        // Loop through each key in this oer's meta object
        for(const key in oer.meta) {

            // If this key is real (not prototype stuff), it has a url property and the value for it hasn't been set
            if(oer.meta.hasOwnProperty(key) && oer.meta[key].url && !oer.meta[key].value) {

                // create a cancel token for this request and add it to the axiosCancelTokens array
                let cancelToken = axios.CancelToken.source();
                this.axiosCancelTokens.push(cancelToken);

                // Get this resource (using the url proptery)
                axios.get(oer.meta[key].url, { cancelToken: cancelToken.token})
                    .then(response => {
                        
                        // Transform the names in the response into one comma delimited string
                        let valuesArray = response.data.map(item => (item.name));
                        let value = valuesArray.join(", ");
                        
                        // Update this oer in state to reflect this newly fetched value
                        this.setState(prevState => {

                            // Start by deep copying any affected state objects/arrays
                            let outer = [...prevState.oers];
                            let oer = {...outer[index]};
                            oer.meta = {...oer.meta};
                            oer.meta[key] = {...oer.meta[key]};
                            oer.meta[key].value = value;
                            outer[index] = oer;
                            // return updated oers list
                            return ({oers: outer});
                        });
                    })
                    .catch(err => {
                        // TODO: - Find a graphical way to show this error to the user
                        console.log(err);
                    });
            }
        }
    }

    render() {
        return(
            <div>
                { /* Show the loading icon or error message depending on state */}
                {this.state.loading ? <div className="loader"></div> : null}
                {this.state.error ? <p className="error">{this.state.error}</p> : null}

                { /* maps through each oer in state and displays it */ }
                <div>
                    {this.state.oers.map((oer, index) => {
                        return(
                            <OerItem key={oer.id} oer={oer} isOpen={index === this.state.open} onClick={() => this.openResourceHandler(index)} />
                        );
                    })}
                </div>
                
                {/* Controls for pagination */}
                <div className="OerControls">

                    <p>Showing {this.state.oers.length} out of {this.state.total} results</p>

                    <p>Page {this.state.page}</p>

                    <div>
                        {this.state.page > 1 ? <button className="Button" onClick={this.previousPage} title="View the previous page of results">Previous Page</button> : null}
                        <button className="Button" onClick={this.nextPage} style={{marginLeft: '1em'}} title="View the next page of results">Next Page</button>
                    </div>

                </div>

            </div>
        );
    }
}

export default Oer;