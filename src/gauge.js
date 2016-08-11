import * as d3 from './vender/d3'
export function directive_gauge($timeout){
		return{
			restrict: 'E',
			scope:{
				data:'=',
				config:'=',
				indicators:'=',
				size:'='
			},
			template: `
				<div  style="position: relative" bs-tooltip="config.pointer.target+': '+data.pointer +'<br>'+config.temperature.target+': '+data.temperature+'<br>'+config.water_mark.target+': '+data.water_mark" >
					<div style="display:block;margin: 0 auto; width: {{size}}px" id="gauge-{{gaugeid}}"> </div>
					<div  style="display:block; margin: 0 auto; width: {{size}}px; text-align: center">
						<div ng-repeat="ind in indicators" ng-style="styleIndicator(ind)" bs-tooltip="ind.target+':'+ind.value">{{ind.name}}</div>
					</div>
					<div ng-if="data.disable!=undefined && data.disable>=config.disable.min && data.disable <=config.disable.max" style="width:100%; height: 100%; position: absolute; top:0; left:0; z-index:10; background-color:rgba(200,200,200,0.4); color:red; font-weight: bold" align="right">{{config.disable.name}}</div>
				</div>`,
			link:function(scope, element, attrs) {
				scope.gaugeid=scope.$id
				var gauge_created=false;
				var g = null;
				function recreate_gauge(){
					if( scope.size>0 &&
						  (scope.config.temperature!=undefined && scope.config.temperature.min!==undefined && scope.config.temperature.min< scope.config.temperature.max) &&
							(scope.config.water_mark!=undefined && scope.config.water_mark.min!==undefined && scope.config.water_mark.min< scope.config.water_mark.max) &&
							(scope.config.pointer!=undefined && scope.config.pointer.min!==undefined && scope.config.pointer.min< scope.config.pointer.max)){
								g=new Gauge('gauge-'+scope.gaugeid,scope.size,scope.config,scope.data);
								g.render();
								gauge_created=true;
							}
				}
				scope.styleIndicator=function(ind){
					var indicator_style={
						  'padding': '2px 3px 1px 3px',
						  'color': '#fff',
						  'font-size': '0.917em',
						  'text-transform': 'uppercase',
						  'text-align': 'center',
						  'min-width': '0.7em',
						  'line-height': '1em',
						  'display': 'inline-block',
						  '-webkit-border-radius': '2px',
						  '-moz-border-radius': '2px',
						  'border-radius': '2px'
					};
					var style_red = Object.assign({'border': '1px solid #d23d3d', 'background-color': '#d64e4e'},indicator_style);
					var style_green = Object.assign({'border': '1px solid #2f9f5e','background-color': '#34af67'},indicator_style);
					if(ind.value!=undefined && ind.value>=ind.min && ind.value <=ind.max) {
						return style_green;
					}else{
						return style_red;
					}

				}
				scope.$on('$locationChangeSuccess',function(){
					if(gauge_created){
						 g.render(); //if windows location changed, we need to update our absolute url references in svg
					 }
				});
				scope.$watch('config',recreate_gauge,true);
				scope.$watch('size',recreate_gauge,true);
				scope.$watch('data',function(){
					if(gauge_created)
						g.redraw(scope.data);
					else{
						recreate_gauge();
					}
				},true);
				$timeout(recreate_gauge,100);
			}
		};
	}

		function Gauge(placeHolder,gauge_size,config,data){
			this.placeHolder=placeHolder;
			var self=this;
			var pointer=config.pointer;
			var temperature=config.temperature;
			var water_mark=config.water_mark;
			var baseUrl;

			var clip,circle_c,circle_s,title_f,title_m,title_v,svg_pointer;
			function valueToDegrees(value)	{return value/pointer.range * 240 - 30;}
			function valueToRadians(value)  {return valueToDegrees(value) * Math.PI / 180;	}
			function valueToPoint(value, factor){
				return {x: gauge_size/2 - gauge_size/2 * factor * Math.cos(valueToRadians(value)),
						y: gauge_size/2 - gauge_size/2 * factor * Math.sin(valueToRadians(value))}
				;
			};
			function scale(value){
				if(value>=this.max)
					return 1;
				else if(value<=this.min)
					return 0;
				else
					return (value-this.min)/this.range;
			};
			this.render=function(){
				function buildPointerPath(value){
					var delta = pointer.range/20;

					var head = valueToPoint(value, 0.85);
					var head1 = valueToPoint(value - delta, 0.12);
					var head2 = valueToPoint(value + delta, 0.12);

					var tailValue = value+pointer.range/240*180;
					var tail = valueToPoint(tailValue, 0.28);
					var tail1 = valueToPoint(tailValue - delta, 0.12);
					var tail2 = valueToPoint(tailValue + delta, 0.12);

					return [head, head1, tail2, tail, tail1, head2, head];
				};
			  baseUrl=window.location.href;
				pointer.range=pointer.max-pointer.min;
				pointer.scale=_.bind(scale,pointer);
				temperature.range=temperature.max-temperature.min;
				temperature.scale=_.bind(scale,temperature);
				water_mark.range=water_mark.max-water_mark.min;
				water_mark.scale=_.bind(scale,water_mark);
				//remove the previous svg if exists
				d3.select('#'+self.placeHolder).select("#svg-"+self.placeHolder).remove();
				var body=d3.select('#'+self.placeHolder)
					.append("svg").attr("id","svg-"+self.placeHolder).attr('width',gauge_size).attr('height',gauge_size);
				var defs=body.append("defs");
				var filter=defs.append("filter").attr('id','dropshadow').attr('height','160%')
					filter.append('feGaussianBlur').attr('in','SourceAlpha').attr('stdDeviation',5).attr('result','blur')
					filter.append('feOffset').attr('in','blur').attr('dx',0).attr('dy',3).attr('result','offsetblur')
					var feMerge=filter.append('feMerge');
					feMerge.append('feMergeNode').attr('in','offsetblur')
					feMerge.append('feMergeNode').attr('in','SourceGraphic')
				clip=defs.append("clipPath").attr('id','rectclip_'+self.placeHolder)
						.append("rect")
							.attr('x',0)
							.attr('height',gauge_size)
							.attr('width',gauge_size)
				;
				circle_s=body.append("circle")
						.attr("cx",gauge_size/2).attr("cy",gauge_size/2)
						.attr("r",gauge_size/2-3)
				;
				circle_c=body.append('circle')
						.attr("cx",gauge_size/2).attr("cy",gauge_size/2)
						.attr("r",gauge_size/2-3)
						.attr('clip-path','url('+baseUrl+'#rectclip_'+self.placeHolder+')')
						.attr("style","stroke:rgb(0,0,0);stroke-width:0;z-index:10000;")
				;
				title_f=body.append("text")
						.attr('x',gauge_size/2)
						.attr('style','font-weight:bold;text-anchor:middle;')
						.style('font-size',gauge_size/17)
				;
				title_m=body.append('text')
						.attr('x',gauge_size/2).attr('y',gauge_size/4)
						.attr('style','font-weight:bold;text-anchor:middle;')
						.style('font-size',gauge_size/15)
						.text(pointer.name)
				;
				title_v=body.append('text')
						.attr('x',gauge_size/2).attr('y',gauge_size/8*3)
						.attr('style','font-weight:bold;text-anchor:middle')
						.style('font-size',gauge_size/10)
				;
				var tickers=body.append('g');
				_.each(_.range(0,pointer.range+1,pointer.range/4),function(tck){
					var pt1=valueToPoint(tck,0.8);
					var pt2=valueToPoint(tck,0.9);
					tickers.append('line')
							.attr('x1',pt1.x).attr('y1',pt1.y)
							.attr('x2',pt2.x).attr('y2',pt2.y)
							.attr('style','stroke:#333;stroke-width:2px');
					if(tck<pointer.max){
						_.each(_.range(tck,tck+pointer.range/4,pointer.range/20),function(tck2){
							var pt1=valueToPoint(tck2,0.85);
							var pt2=valueToPoint(tck2,0.9);
							tickers.append('line')
									.attr('x1',pt1.x).attr('y1',pt1.y)
									.attr('x2',pt2.x).attr('y2',pt2.y)
									.attr('style','stroke:#333;stroke-width:1px');
						});
					}
				});
				svg_pointer=body.append('g');
				svg_pointer.selectAll('path')
						.data([buildPointerPath(pointer.range/2)])
							.enter().append('path')
								.attr('d',d3.svg.line().x(function(d){return d.x;}).y(function(d){return d.y;}).interpolate('basis'))
								.attr('style','stroke:#c63110;fill-opacity:0.6')
				;
				svg_pointer.append('circle')
						.attr('cx',gauge_size/2).attr('cy',gauge_size/2)
						.attr('r',gauge_size/50)
						.attr('style','fill:#4684EE;stroke:#666;opacity:1')
				;
				self.redraw(data);
			};
			this.calcWaterMark=function(d){
				if(water_mark.value_as_space){
				  return water_mark.scale(d.water_mark);
			  }else {
					return 1-water_mark.scale(d.water_mark);
			  }
			}
			this.redraw=function(data){
					clip.data([data])
						.transition().duration(1)
						.attr('y',function(d){return gauge_size*self.calcWaterMark(d)-3;});
					circle_c.data([data])
						.attr("fill",function(d) { return "hsl("+120*(1-temperature.scale(d.temperature))+",100%,60%)";});
					circle_s.data([data])
						.attr("style",function(d) { return "stroke:hsl("+120*(1-temperature.scale(d.temperature))+",100%,60%);stroke-width:2;fill:white;filter:url("+baseUrl+"#dropshadow)";});
					title_f.data([data])
						.attr('y',function(d) { return gauge_size*self.calcWaterMark(d)-3})
						.text(function(d) { return water_mark.name+':'+Math.round(d.water_mark)+' '+temperature.name+':'+Math.round(d.temperature)});
					title_v.data([data])
						.text(function(d){return Math.round(d.pointer)});
					svg_pointer.data([data])
						.attr('transform',function(d){
							return 'rotate('+ (pointer.scale(d.pointer)*240-120) +',' +gauge_size/2+','+gauge_size/2+')'})
						.style('fill',function(d) {return "hsl("+120*(1-temperature.scale(d.temperature))+",100%,60%)";})
					;
			}
		};
