var menus_arr = [ '<td class="en_rmf1" id="menu0"><a href="javascript:ShowSubData(0)" class="data_m1">Groups</a></td>','<td class="en_rmf1" id="menu1"><a href="javascript:ShowSubData(1)" class="data_m1">1/16 Final</a></td>','<td class="en_rmf1" id="menu2"><a href="javascript:ShowSubData(2)" class="data_m1">1/8 Final</a></td>','<td class="en_rmf1" id="menu3"><a href="javascript:ShowSubData(3)" class="data_m1">Quarter-finals</a></td>','<td class="en_rmf1" id="menu4"><a href="javascript:ShowSubData(4)" class="data_m1">Semi-finals</a></td>','<td class="en_rmf1" id="menu5"><a href="javascript:ShowSubData(5)" class="data_m1">3rd place</a></td>','<td class="en_rmf1" id="menu6"><a href="javascript:ShowSubData(6)" class="data_m1">Final</a></td>'];
var menus_app_arr = [ 1,1,1,1,1,1,1];
var ord_arr = [ 0,1,2,3,4,5,6];
var stat_type_arr = [ 0,0,0,0,0,0,0];
var s_name_arr = [ 'Groups','1/16 Final','1/8 Final','Quarter-finals','Semi-finals','3rd place','Final'];
var note_arr = [ '','','','','','',''];
var defaultord = 0;
var isGroups_arr = [ 1,0,0,0,0,0,0];
var HaveRun_arr = [ 0,1,1,1,0,0,0];
var currentRun_arr = [ 0,73,90,97,0,0,0];
var MaxRun_arr = [ 0,88,96,100,0,0,0];
var Start_time_arr = [];
Start_time_arr[0] = [ '2026,06,12,03,00,00','2026,06,12,10,00,00','2026,06,18,23,59,00','2026,06,19,09,00,00','2026,06,25,09,00,00','2026,06,25,09,00,00','2026,06,13,03,00,00','2026,06,14,03,00,00','2026,06,19,03,00,00','2026,06,19,06,00,00','2026,06,25,03,00,00','2026,06,25,03,00,00','2026,06,14,06,00,00','2026,06,14,09,00,00','2026,06,20,06,00,00','2026,06,20,08,30,00','2026,06,25,06,00,00','2026,06,25,06,00,00','2026,06,13,09,00,00','2026,06,14,12,00,00','2026,06,20,03,00,00','2026,06,20,11,00,00','2026,06,26,10,00,00','2026,06,26,10,00,00','2026,06,15,01,00,00','2026,06,15,07,00,00','2026,06,21,04,00,00','2026,06,21,08,00,00','2026,06,26,04,00,00','2026,06,26,04,00,00','2026,06,15,04,00,00','2026,06,15,10,00,00','2026,06,21,01,00,00','2026,06,21,12,00,00','2026,06,26,07,00,00','2026,06,26,07,00,00','2026,06,16,03,00,00','2026,06,16,09,00,00','2026,06,22,03,00,00','2026,06,22,09,00,00','2026,06,27,11,00,00','2026,06,27,11,00,00','2026,06,15,23,59,00','2026,06,16,06,00,00','2026,06,21,23,59,00','2026,06,22,06,00,00','2026,06,27,08,00,00','2026,06,27,08,00,00','2026,06,17,03,00,00','2026,06,17,06,00,00','2026,06,23,05,00,00','2026,06,23,08,00,00','2026,06,27,03,00,00','2026,06,27,03,00,00','2026,06,17,09,00,00','2026,06,17,12,00,00','2026,06,23,01,00,00','2026,06,23,11,00,00','2026,06,28,10,00,00','2026,06,28,10,00,00','2026,06,18,01,00,00','2026,06,18,10,00,00','2026,06,24,01,00,00','2026,06,24,10,00,00','2026,06,28,07,30,00','2026,06,28,07,30,00','2026,06,18,04,00,00','2026,06,18,07,00,00','2026,06,24,04,00,00','2026,06,24,07,00,00','2026,06,28,05,00,00','2026,06,28,05,00,00'];
Start_time_arr[1] = [ '2026,06,29,03,00,00','2026,06,30,04,30,00','2026,06,30,09,00,00','2026,06,30,01,00,00','2026,07,01,05,00,00','2026,07,01,01,00,00','2026,07,01,09,00,00','2026,07,01,23,59,00','2026,07,02,08,00,00','2026,07,02,04,00,00','2026,07,03,07,00,00','2026,07,03,03,00,00','2026,07,03,11,00,00','2026,07,04,06,00,00','2026,07,04,09,30,00','2026,07,04,02,00,00'];
Start_time_arr[2] = [ '2026,07,05,05,00,00','2026,07,05,01,00,00','2026,07,06,04,00,00','2026,07,06,08,00,00','2026,07,07,03,00,00','2026,07,07,08,00,00','2026,07,07,23,59,00','2026,07,08,04,00,00'];
Start_time_arr[3] = [ '2026,07,10,04,00,00','2026,07,11,03,00,00','2026,07,12,05,00,00','2026,07,12,09,00,00'];
Start_time_arr[4] = [ '2026,07,15,03,00,00','2026,07,16,03,00,00'];
Start_time_arr[5] = [ '2026,07,19,05,00,00'];
Start_time_arr[6] = [ '2026,07,20,03,00,00'];
var live_bh_arr = [];
live_bh_arr[0] = [ 5001993,5058661,5058662,5001994,5001995,5058663,5058664,5002006,5058665,5002008,5002007,5058666,5002000,5002002,5002005,5002001,5002003,5002004,5001996,5058668,5001997,5058669,5001998,5058670,5002009,5002010,5002013,5002012,5002014,5002015,5002017,5058671,5058672,5002019,5002018,5058673,5002024,5002025,5002020,5002021,5002022,5002023,5002027,5002026,5002028,5002029,5002031,5002032,5002042,5058684,5058685,5002044,5002043,5058686,5002036,5002037,5002038,5002039,5002040,5002041,5058674,5002051,5002052,5058675,5002053,5058676,5002045,5002046,5002047,5002048,5002049,5002050];
live_bh_arr[1] = [ 5058728,5058730,5058731,5058729,5058734,5058732,5058735,5058736,5058738,5058737,5058740,5058739,5058741,5058743,5058744,5058742];
live_bh_arr[2] = [ 5058746,5058745,5058747,5058748,5058749,5058750,5058751,5058752];
live_bh_arr[3] = [ 5058753,5058754,5058755,5058756];
live_bh_arr[4] = [ 5058757,5058758];
live_bh_arr[5] = [ 5058759];
live_bh_arr[6] = [ 5058760];
var score_arr = [];
score_arr[0] = [ '2-0(1-0)','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS'];
score_arr[1] = [ 'VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS','VS'];
score_arr[2] = [ 'VS','VS','VS','VS','VS','VS','VS','VS'];
score_arr[3] = [ 'VS','VS','VS','VS'];
score_arr[4] = [ 'VS','VS'];
score_arr[5] = [ 'VS'];
score_arr[6] = [ 'VS'];
var RedCardA_arr = [];
RedCardA_arr[0] = [ 1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
RedCardA_arr[1] = [ 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
RedCardA_arr[2] = [ 0,0,0,0,0,0,0,0];
RedCardA_arr[3] = [ 0,0,0,0];
RedCardA_arr[4] = [ 0,0];
RedCardA_arr[5] = [ 0];
RedCardA_arr[6] = [ 0];
var RedCardB_arr = [];
RedCardB_arr[0] = [ 2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
RedCardB_arr[1] = [ 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
RedCardB_arr[2] = [ 0,0,0,0,0,0,0,0];
RedCardB_arr[3] = [ 0,0,0,0];
RedCardB_arr[4] = [ 0,0];
RedCardB_arr[5] = [ 0];
RedCardB_arr[6] = [ 0];
var TeamA_bh_arr = [];
TeamA_bh_arr[0] = [ 214,208,331,214,209,331,334,940,171,334,171,465,510,1187,103,510,103,912,232,632,232,79,519,79,431,830,431,412,16668,412,361,172,361,907,907,173,481,16,481,612,565,612,51,152,51,52,1275,52,410,928,410,196,196,164,580,708,580,1017,581,1017,186,706,186,383,383,908,13,619,13,834,310,834];
TeamA_bh_arr[1] = [ 25570,25582,25580,25578,727010,25581,25576,727013,25574,452103,749018,452104,25572,749021,749022,25583];
TeamA_bh_arr[2] = [ 749025,749024,749027,749030,749034,749032,749037,749036];
TeamA_bh_arr[3] = [ 749040,749044,749042,749046];
TeamA_bh_arr[4] = [ 749048,749050];
TeamA_bh_arr[5] = [ 452107];
TeamA_bh_arr[6] = [ 18633];
var TeamB_bh_arr = [];
TeamB_bh_arr[0] = [ 209,331,209,208,208,214,465,171,465,940,334,940,912,103,912,1187,510,1187,519,79,632,519,632,232,16668,412,830,16668,830,431,173,907,172,173,361,172,565,612,16,565,16,481,1275,52,152,1275,152,51,164,196,928,164,410,928,581,1017,708,581,708,580,908,383,706,908,186,706,310,834,619,310,619,13];
TeamB_bh_arr[1] = [ 25584,727008,25568,25585,727011,727009,727012,727014,727016,727015,749019,749017,749020,452105,749023,452106];
TeamB_bh_arr[2] = [ 749028,749026,749029,749031,749035,749033,749039,749038];
TeamB_bh_arr[3] = [ 749041,749045,749043,749047];
TeamB_bh_arr[4] = [ 749049,749051];
TeamB_bh_arr[5] = [ 452108];
TeamB_bh_arr[6] = [ 18634];
var TeamA_arr = [];
TeamA_arr[0] = [ 'Mexico','Korea Republic(N)','Czech Republic(N)','Mexico','South Africa(N)','Czech Republic(N)','Canada','Qatar(N)','Switzerland(N)','Canada','Switzerland(N)','Bosnia and Herzegovina(N)','Brazil(N)','Haiti(N)','Scotland(N)','Brazil(N)','Scotland(N)','Morocco(N)','USA','Australia(N)','USA','Turkiye(N)','Paraguay(N)','Turkiye(N)','Germany(N)','Cote d\'Ivoire(N)','Germany(N)','Ecuador(N)','Curacao(N)','Ecuador(N)','Netherlands(N)','Sweden(N)','Netherlands(N)','Tunisia(N)','Tunisia(N)','Japan(N)','Belgium(N)','Iran(N)','Belgium(N)','New Zealand(N)','Egypt(N)','New Zealand(N)','Spain(N)','Saudi Arabia(N)','Spain(N)','Uruguay(N)','Cape Verde(N)','Uruguay(N)','France(N)','Iraq(N)','France(N)','Norway(N)','Norway(N)','Senegal(N)','Argentina(N)','Austria(N)','Argentina(N)','Jordan(N)','Algeria(N)','Jordan(N)','Portugal(N)','Uzbekistan(N)','Portugal(N)','Colombia(N)','Colombia(N)','Democratic Rep Congo(N)','England(N)','Ghana(N)','England(N)','Panama(N)','Croatia(N)','Panama(N)'];
TeamA_arr[1] = [ 'A2','E1','F1','C1','I1','E2','A1','L1','D1','G1','K2','H1','B1','J1','K1','D2'];
TeamA_arr[2] = [ 'Match 74 Winner','Match 73 Winner','Match 76 Winner','Match 79 Winner','Match 83 Winner','Match 81 Winner','Match 86 Winner','Match 85 Winner'];
TeamA_arr[3] = [ 'Match 89 Winner','Match 93 Winner','Match 91 Winner','Match 95 Winner'];
TeamA_arr[4] = [ 'Match 97 Winner','Match 99 Winner'];
TeamA_arr[5] = [ 'Loser SF1'];
TeamA_arr[6] = [ 'Winner SF1'];
var TeamB_arr = [];
TeamB_arr[0] = [ 'South Africa','Czech Republic','South Africa','Korea Republic','Korea Republic','Mexico','Bosnia and Herzegovina','Switzerland','Bosnia and Herzegovina','Qatar','Canada','Qatar','Morocco','Scotland','Morocco','Haiti','Brazil','Haiti','Paraguay','Turkiye','Australia','Paraguay','Australia','USA','Curacao','Ecuador','Cote d\'Ivoire','Curacao','Cote d\'Ivoire','Germany','Japan','Tunisia','Sweden','Japan','Netherlands','Sweden','Egypt','New Zealand','Iran','Egypt','Iran','Belgium','Cape Verde','Uruguay','Saudi Arabia','Cape Verde','Saudi Arabia','Spain','Senegal','Norway','Iraq','Senegal','France','Iraq','Algeria','Jordan','Austria','Algeria','Austria','Argentina','Democratic Rep Congo','Colombia','Uzbekistan','Democratic Rep Congo','Portugal','Uzbekistan','Croatia','Panama','Ghana','Croatia','Ghana','England'];
TeamB_arr[1] = [ 'B2','A3/B3/C3/D3/F3','C2','F2','C3/D3/F3/G3/H3','I2','C3/E3/F3/H3/I3','E3/H3/I3/J3/K3','B3/E3/F3/I3/J3','A3/E3/H3/I3/J3','L2','J2','E3/F3/G3/I3/J3','H2','D3/E3/I3/J3/L3','G2'];
TeamB_arr[2] = [ 'Match 77 Winner','Match 75 Winner','Match 78 Winner','Match 80 Winner','Match 84 Winner','Match 82 Winner','Match 88 Winner','Match 87 Winner'];
TeamB_arr[3] = [ 'Match 90 Winner','Match 94 Winner','Match 92 Winner','Match 96 Winner'];
TeamB_arr[4] = [ 'Match 98 Winner','Match 100 Winner'];
TeamB_arr[5] = [ 'Loser SF2'];
TeamB_arr[6] = [ 'Winner SF2'];
var living_Arr = [];
living_Arr[0] = [ "CCTV5<br>HK NOW 688<br>TDM (Sports)<br>ViuTV 99<br>HK NOW 618<br>HK NOW 616","CCTV5<br>HK NOW 688<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)","CCTV5<br>TDM (Sports)<br>ViuTV 99","TDM (Sports)<br>ViuTV 99","TDM(Entretenimento)","CCTV5<br>TDM (Sports)<br>ViuTV 99<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)","CCTV5<br>TDM (Sports)","TDM (Sports)","TDM(Entretenimento)","CCTV5<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)","CCTV5<br>TDM (Sports)","TDM (Sports)","TDM(Entretenimento)","CCTV5<br>HK NOW 688<br>TDM (Sports)<br>ViuTV 99<br>HK NOW 618<br>HK NOW 616","CCTV5<br>HK NOW 688<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)<br>ViuTV 99","CCTV5<br>TDM (Sports)","TDM(Entretenimento)","TDM (Sports)<br>ViuTV 99","CCTV5<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)","CCTV5<br>TDM (Sports)","TDM(Entretenimento)","TDM (Sports)","CCTV5<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>HK NOW 688<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)","CCTV5<br>TDM (Sports)<br>ViuTV 99","TDM(Entretenimento)","TDM (Sports)","CCTV5<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)","CCTV5<br>TDM (Sports)<br>ViuTV 99","TDM(Entretenimento)","TDM (Sports)<br>ViuTV 99","CCTV5<br>HK NOW 688<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)","CCTV5<br>TDM (Sports)","TDM(Entretenimento)","TDM (Sports)","CCTV5<br>TDM (Sports)<br>ViuTV 99<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)","CCTV5<br>TDM (Sports)<br>ViuTV 99","TDM (Sports)","TDM(Entretenimento)","CCTV5<br>HK NOW 688<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)<br>HK NOW 618<br>HK NOW 616","CCTV5<br>TDM (Sports)","CCTV5<br>TDM (Sports)<br>ViuTV 99","TDM(Entretenimento)","TDM (Sports)","CCTV5<br>TDM (Sports)","CCTV5<br>TDM (Sports)<br>ViuTV 99","TDM (Sports)","TDM (Sports)<br>ViuTV 99","TDM (Sports)","TDM(Entretenimento)","CCTV5<br>TDM (Sports)","CCTV5<br>TDM (Sports)","TDM (Sports)","TDM (Sports)<br>ViuTV 99","TDM(Entretenimento)","TDM (Sports)"];
living_Arr[1] = [ "","","","","","","","","","","","","","","",""];
living_Arr[2] = [ "","","","","","","",""];
living_Arr[3] = [ "","","",""];
living_Arr[4] = [ "",""];
living_Arr[5] = [ ""];
living_Arr[6] = [ ""];
var Stadium_Arr = [];
Stadium_Arr[0] = [ 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
Stadium_Arr[1] = [ 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
Stadium_Arr[2] = [ 0,0,0,0,0,0,0,0];
Stadium_Arr[3] = [ 0,0,0,0];
Stadium_Arr[4] = [ 0,0];
Stadium_Arr[5] = [ 0];
Stadium_Arr[6] = [ 0];
var sd_arr = [];
sd_arr[0] = [ '','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''];
sd_arr[1] = [ '','','','','','','','','','','','','','','',''];
sd_arr[2] = [ '','','','','','','',''];
sd_arr[3] = [ '','','',''];
sd_arr[4] = [ '',''];
sd_arr[5] = [ ''];
sd_arr[6] = [ ''];
var Memo_arr = [];
Memo_arr[0] = [ '<br/>Kick-off(Mexico)&nbsp;&nbsp;First Corner Kick(Mexico)&nbsp;&nbsp;First Yellow Card(South Africa)<br/>(3) Corner Kicks (1)<br/>(1) Yellow Cards (2)<br/>(1) Offsides (1)<br/>(5) Substitutions (4)','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''];
Memo_arr[1] = [ '','','','','','','','','','','','','','','',''];
Memo_arr[2] = [ '','','','','','','',''];
Memo_arr[3] = [ '','','',''];
Memo_arr[4] = [ '',''];
Memo_arr[5] = [ ''];
Memo_arr[6] = [ ''];
var group_arr = [];
group_arr[0] = [ 1,1,1,1,1,1,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,7,7,7,7,7,7,8,8,8,8,8,8,9,9,9,9,9,9,10,10,10,10,10,10,11,11,11,11,11,11,12,12,12,12,12,12];
group_arr[1] = [ 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
group_arr[2] = [ 0,0,0,0,0,0,0,0];
group_arr[3] = [ 0,0,0,0];
group_arr[4] = [ 0,0];
group_arr[5] = [ 0];
group_arr[6] = [ 0];
var groups_arr = [];
groups_arr[0] = [ 'A','A','A','A','A','A','B','B','B','B','B','B','C','C','C','C','C','C','D','D','D','D','D','D','E','E','E','E','E','E','F','F','F','F','F','F','G','G','G','G','G','G','H','H','H','H','H','H','I','I','I','I','I','I','J','J','J','J','J','J','K','K','K','K','K','K','L','L','L','L','L','L'];
groups_arr[1] = [ '','','','','','','','','','','','','','','',''];
groups_arr[2] = [ '','','','','','','',''];
groups_arr[3] = [ '','','',''];
groups_arr[4] = [ '',''];
groups_arr[5] = [ ''];
groups_arr[6] = [ ''];
var run_arr = [];
run_arr[0] = [ 1,1,2,2,3,3,1,1,2,2,3,3,1,1,2,2,3,3,1,1,2,2,3,3,1,1,2,2,3,3,1,1,2,2,3,3,1,1,2,2,3,3,1,1,2,2,3,3,1,1,2,2,3,3,1,1,2,2,3,3,1,1,2,2,3,3,1,1,2,2,3,3];
run_arr[1] = [ 73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88];
run_arr[2] = [ 89,90,91,92,93,94,95,96];
run_arr[3] = [ 97,98,99,100];
run_arr[4] = [ 0,0];
run_arr[5] = [ 0];
run_arr[6] = [ 0];
var Statings_arr = [];
Statings_arr[0] = new Array();Statings_arr[0][0] = [[ 0,0,0,0],[ 'A','A','A','A'],[ 0,0,0,0],[ 214,331,208,209],[ 'Mexico','Czech Republic','Korea Republic','South Africa'],[ 1,0,0,1],[ 1,0,0,0],[ 0,0,0,0],[ 0,0,0,1],[ 2,0,0,0],[ 0,0,0,2],[ 3,0,0,0],[ '','','',''],[ '','','',''],[ 0,0,0,0],[ 0,0,0,0] ];
Statings_arr[0][1] = [[ 0,0,0,0],[ 'B','B','B','B'],[ 0,0,0,0],[ 171,334,465,940],[ 'Switzerland','Canada','Bosnia and Herzegovina','Qatar'],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ '','','',''],[ '','','',''],[ 0,0,0,0],[ 0,0,0,0] ];
Statings_arr[0][2] = [[ 0,0,0,0],[ 'C','C','C','C'],[ 0,0,0,0],[ 103,510,912,1187],[ 'Scotland','Brazil','Morocco','Haiti'],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ '','','',''],[ '','','',''],[ 0,0,0,0],[ 0,0,0,0] ];
Statings_arr[0][3] = [[ 0,0,0,0],[ 'D','D','D','D'],[ 0,0,0,0],[ 79,232,519,632],[ 'Turkiye','USA','Paraguay','Australia'],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ '','','',''],[ '','','',''],[ 0,0,0,0],[ 0,0,0,0] ];
Statings_arr[0][4] = [[ 0,0,0,0],[ 'E','E','E','E'],[ 0,0,0,0],[ 412,431,830,16668],[ 'Ecuador','Germany','Cote d\'Ivoire','Curacao'],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ '','','',''],[ '','','',''],[ 0,0,0,0],[ 0,0,0,0] ];
Statings_arr[0][5] = [[ 0,0,0,0],[ 'F','F','F','F'],[ 0,0,0,0],[ 172,173,361,907],[ 'Sweden','Japan','Netherlands','Tunisia'],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ '','','',''],[ '','','',''],[ 0,0,0,0],[ 0,0,0,0] ];
Statings_arr[0][6] = [[ 0,0,0,0],[ 'G','G','G','G'],[ 0,0,0,0],[ 16,481,565,612],[ 'Iran','Belgium','Egypt','New Zealand'],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ '','','',''],[ '','','',''],[ 0,0,0,0],[ 0,0,0,0] ];
Statings_arr[0][7] = [[ 0,0,0,0],[ 'H','H','H','H'],[ 0,0,0,0],[ 51,52,152,1275],[ 'Spain','Uruguay','Saudi Arabia','Cape Verde'],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ '','','',''],[ '','','',''],[ 0,0,0,0],[ 0,0,0,0] ];
Statings_arr[0][8] = [[ 0,0,0,0],[ 'I','I','I','I'],[ 0,0,0,0],[ 164,196,410,928],[ 'Senegal','Norway','France','Iraq'],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ '','','',''],[ '','','',''],[ 0,0,0,0],[ 0,0,0,0] ];
Statings_arr[0][9] = [[ 0,0,0,0],[ 'J','J','J','J'],[ 0,0,0,0],[ 580,581,708,1017],[ 'Argentina','Algeria','Austria','Jordan'],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ '','','',''],[ '','','',''],[ 0,0,0,0],[ 0,0,0,0] ];
Statings_arr[0][10] = [[ 0,0,0,0],[ 'K','K','K','K'],[ 0,0,0,0],[ 186,383,706,908],[ 'Portugal','Colombia','Uzbekistan','Democratic Rep Congo'],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ '','','',''],[ '','','',''],[ 0,0,0,0],[ 0,0,0,0] ];
Statings_arr[0][11] = [[ 0,0,0,0],[ 'L','L','L','L'],[ 0,0,0,0],[ 13,310,619,834],[ 'England','Croatia','Ghana','Panama'],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ 0,0,0,0],[ '','','',''],[ '','','',''],[ 0,0,0,0],[ 0,0,0,0] ];
var d_last_update = '2026/6/12 7:48:21';
