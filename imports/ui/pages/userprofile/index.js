/**
* Copyright 2019 IBM Corp. All Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*      http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

import './page.scss';
import './page.html';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { Orgs } from '/imports/api/org/orgs';
import _ from 'lodash';

Template.UserProfile_home.events({
    'click button': function() {
        Meteor.call('generateApikey');
    }
});

Template.UserProfile_home.onCreated(function() {
    this.autorun(() => {
        this.subscribe('userData');
    });
});

var refreshStatus = new ReactiveVar('');

Template.UserProfile_orgs.onCreated(function(){
    this.autorun(()=>{
        this.subscribe('orgsForUser');
    });
});

Template.UserProfile_orgs.helpers({
    refreshStatus(){
        return refreshStatus.get();
    },
    orgNames(){
        return _.get(Meteor.user(), 'profile.orgs', []).sort((a,b)=>a.name.toLowerCase().localeCompare(b.name.toLowerCase())) || [];
    },
    orgExists(name){
        return !!Orgs.findOne({ name });
    },
    isAdminOfOrg(name){
        var orgs = _.get(Meteor.user(), 'profile.orgs', []);
        var org = _.find(orgs, (org)=>{
            return org.name === name;
        });
        return (org.role === 'admin');
    },
});

Template.UserProfile_orgs.events({
    'click .refresh-btn'(){
        refreshStatus.set('fa-spin');
        Meteor.call('reloadUserOrgList', ()=>{
            refreshStatus.set('');
        });
    },
});

Template.UserProfile_orgs_register_btn.onCreated(function(){
    this.isRegistering = new ReactiveVar(false);
});

Template.UserProfile_orgs_register_btn.helpers({
    isRegistering(){
        return Template.instance().isRegistering.get();
    },
});

Template.UserProfile_orgs_register_btn.events({
    'click .registerOrgBtn'(){
        var inst = Template.instance();
        var orgName = Template.currentData().org.name;

        inst.isRegistering.set(true);
        Meteor.call('registerOrg', orgName, (err)=>{
            inst.isRegistering.set(false);
            if(err){
                throw err;
            }
        });
        return false;
    }
});
