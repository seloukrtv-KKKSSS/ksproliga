import assert from 'node:assert/strict'
import {registerHooks} from 'node:module'
const hooks=registerHooks({resolve(specifier,context,next){if(context.parentURL?.includes('/lib/')&&specifier.startsWith('./')&&!specifier.endsWith('.ts'))return next(specifier+'.ts',context);return next(specifier,context)}})
try{
 const {summarizePlayerEvents,summarizeMatchGoals}=await import('../lib/match-event-summary.ts')
 const match={id:10,home_team:'Home',away_team:'Away'}
 const goals=[{match_id:10,team_name:'Home',player_name:'Іван Коваль',goal_type:'regular'},{match_id:10,team_name:'Home',player_name:'Іван Коваль',goal_type:'penalty'},{match_id:10,team_name:'Home',player_name:'Іван Коваль',goal_type:'own_goal'},{match_id:11,team_name:'Home',player_name:'Іван Коваль',goal_type:'regular'},{match_id:10,team_name:'Away',player_name:'Іван Коваль',goal_type:'regular'}]
 const cards=[{match_id:10,team_name:'Home',player_name:'Іван Коваль',card_type:'yellow'},{match_id:10,team_name:'Home',player_name:'Іван Коваль',card_type:'yellow_red'},{match_id:10,team_name:'Away',player_name:'Іван Коваль',card_type:'red'},{match_id:11,team_name:'Home',player_name:'Іван Коваль',card_type:'red'}]
 assert.deepEqual(summarizePlayerEvents('  ІВАН  Коваль ','Home',10,goals,cards),{goals:2,yellow:2,red:1})
 assert.deepEqual(summarizeMatchGoals(match,goals),{home:2,away:2})
 assert.deepEqual(summarizePlayerEvents('Other','Home',10,goals,cards),{goals:0,yellow:0,red:0})
 console.log('PASS: match/team isolation, repeat scorers, penalties, own-goal score attribution and second-yellow totals')
}finally{hooks.deregister()}
