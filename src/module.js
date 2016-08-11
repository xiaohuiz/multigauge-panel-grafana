import {MetricsPanelCtrl} from 'app/plugins/sdk';
import TimeSeries from 'app/core/time_series2';
import _ from 'lodash';
import {directive_gauge} from './gauge'

// Set and populate defaults
var panelDefaults = {
  links: [],
  datasource: null,
  maxDataPoints: 3,
  interval: null,
  targets: [{}],
  cacheTimeout: null,
  measures:{
    pointer:{name:'',target:'',thresholds:"0,100",valueName:'avg'},
    water_mark:{name:'',target:'',thresholds:"0,1",valueName:'avg',value_as_space:false},
    temperature:{name:'',target:'',thresholds:"0,1",valueName:'avg'},
    disable:{name:'',target:'',thresholds:"0,1",valueName:'avg'},
    indicators:[],
    series_names:[]
  },
  multigauge:{config:{},data:{},indicators:[]}
  //{size:200, color_scale: {name:ctrl.panel.data.temperature.name, min:ctrl.panel.data.temperature.min, max:ctrl.panel.data.temperature.max}, util_scale: {name:ctrl.panel.data.water_mark.name, min:ctrl.panel.data.water_mark.min, max:ctrl.panel.data.water_mark.max}, measure: {name:ctrl.panel.data.pointer.name, min:ctrl.panel.data.pointer.min, max:ctrl.panel.data.pointer.max}}
  //{color_scale:ctrl.panel.data.temperature.value, util_scale:ctrl.panel.data.water_mark.value, measure:ctrl.panel.data.pointer.value}
  //data:{pointer:{},water_mark:{},temperature:{},indicators:[]}
};

//register the directive
angular.module('grafana.directives').directive('gauge',['$timeout',directive_gauge]);

class MultiGaugeCtrl extends MetricsPanelCtrl {
  constructor($scope, $injector, $rootScope) {
    super($scope, $injector);
    this.$rootScope = $rootScope;
    _.defaults(this.panel, panelDefaults);
    this.valueNameOptions = ['avg', 'current', 'min','max','total'];

    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
  }

  onInitEditMode() {
    this.addEditorTab('Options', 'public/plugins/grafana-multigauge-panel/editor.html', 2);
    //this.unitFormats = kbn.getUnitFormats();
  }
  onDataError(err) {
    this.onDataReceived([]);
  }
  onDataReceived(dataList) {
    this.dataList=dataList;
    this.refreshData();
  }
  refreshData(){
    this.panel.measures.series_names=_.size(this.dataList)>0 ? _.map(this.dataList,s=>s.target) : [];
    _.each(['pointer','water_mark','temperature','disable'],m=>{
      var c =this.getData(this.panel.measures[m],this.dataList)[0];
      this.panel.multigauge.config[m] =c;
      this.panel.multigauge.data[m] = c.value;
    });
    this.panel.multigauge.indicators=[];
    _.each(this.panel.measures['indicators'], m=>{
      var matched_series=this.getData(m,this.dataList); //add all indicators regardless having data or not
      this.panel.multigauge.indicators = this.panel.multigauge.indicators.concat(matched_series);
    });
    this.$timeout(this.render.bind(this));
  }
  getData(measure,series){
    //var measure=this.panel.measures[measure_name];
    var _re=measure.target.match(/^\/(.+)\/$/);
    var re= new RegExp(_re ? _re[1] : '^'+measure.target+'$');
    var matched_series=_.filter(series, s=>s.target.search(re)>=0);
    if(_.size(matched_series)>0){
      return _.map(matched_series,s=>{return this.combineMetaAndData(measure,s);});
    }else {
      return [this.combineMetaAndData(measure)];
    }
  }
  combineMetaAndData(measure,series){
    var v=_.assign({
      min: +measure.thresholds.split(',')[0],
      max: +measure.thresholds.split(',')[1],
      value: null
    },measure);
    if(v.name=='') v.name=v.target;
    if(series && series.target!=undefined) v.target=series.target;
    if(series && _.size(series.datapoints)>0){
      var ts = new TimeSeries({datapoints: series.datapoints, alias: series.target, });
      ts.flotpairs = ts.getFlotPairs();
      v.value=Math.round(100*ts.stats[measure.valueName])/100;
    }
    return v;
  }
  addIndicator(){
    this.panel.measures.indicators.push({name:'',target:'',thresholds:''})
  }
  removeIndicator(indicator){
    _.remove(this.panel.measures.indicators,indicator);
    this.refreshData();
  }
}
MultiGaugeCtrl.templateUrl = 'module.html';

export {
  MultiGaugeCtrl as PanelCtrl
};
