"""
원숭이 족치기 웹 게임
Flask 기반 웹 서버
"""

from flask import Flask, render_template, jsonify, request
from datetime import datetime, timedelta
import json

app = Flask(__name__)

# 게임 상태 데이터 (세션별로 관리하려면 Flask-Session을 사용할 수 있지만, 
# 단순화를 위해 메모리에 저장)
game_data = {
    'money': 0,
    'current_tool': 'fist',  # 현재 선택된 도구
    'damage': 1,  # 현재 데미지
    'tools': {  # 보유한 도구들
        'fist': {
            'name': '주먹',
            'damage': 1,
            'price': 0,
            'owned': True,
            'icon': '👊',  # fallback 이모지
            'image': 'fist.png'  # 이미지 파일명
        },
        'stick': {
            'name': '나무 막대기',
            'damage': 5,
            'price': 50,
            'owned': False,
            'icon': '🪵',
            'image': 'stick.png'
        },
        'bat': {
            'name': '야구 방망이',
            'damage': 15,
            'price': 200,
            'owned': False,
            'icon': '🏏',
            'image': 'bat.png'
        },
        'hammer': {
            'name': '망치',
            'damage': 50,
            'price': 1000,
            'owned': False,
            'icon': '🔨',
            'image': 'hammer.png'
        },
        'sword': {
            'name': '검',
            'damage': 200,
            'price': 5000,
            'owned': False,
            'icon': '⚔️',
            'image': 'sword.png'
        },
        'axe': {
            'name': '도끼',
            'damage': 1000,
            'price': 25000,
            'owned': False,
            'icon': '🪓',
            'image': 'axe.png'
        }
    }
}


@app.route('/')
def index():
    """메인 게임 페이지"""
    return render_template('index.html')


@app.route('/api/game-state', methods=['GET'])
def get_game_state():
    """현재 게임 상태를 반환"""
    return jsonify(game_data)


@app.route('/api/hit', methods=['POST'])
def hit_monkey():
    """원숭이를 때리는 액션 처리"""
    global game_data
    
    data = request.get_json()
    damage_multiplier = data.get('multiplier', 1.0)  # 콤보 보너스 등으로 인한 배수
    
    # 현재 도구의 데미지로 돈 계산 (데미지 = 얻는 돈)
    earned_money = int(game_data['damage'] * damage_multiplier)
    game_data['money'] += earned_money
    
    return jsonify({
        'success': True,
        'earned_money': earned_money,
        'total_money': game_data['money'],
        'damage': game_data['damage']
    })


@app.route('/api/buy-tool', methods=['POST'])
def buy_tool():
    """도구 구매 처리"""
    global game_data
    
    data = request.get_json()
    tool_id = data.get('tool_id')
    
    if tool_id not in game_data['tools']:
        return jsonify({'success': False, 'message': '존재하지 않는 도구입니다.'}), 400
    
    tool = game_data['tools'][tool_id]
    
    # 이미 보유한 경우
    if tool['owned']:
        return jsonify({'success': False, 'message': '이미 보유한 도구입니다.'}), 400
    
    # 돈이 부족한 경우
    if game_data['money'] < tool['price']:
        return jsonify({'success': False, 'message': '돈이 부족합니다.'}), 400
    
    # 구매 처리
    game_data['money'] -= tool['price']
    tool['owned'] = True
    
    return jsonify({
        'success': True,
        'message': f'{tool["name"]}을(를) 구매했습니다!',
        'money': game_data['money'],
        'tool': tool
    })


@app.route('/api/equip-tool', methods=['POST'])
def equip_tool():
    """도구 장착 처리"""
    global game_data
    
    data = request.get_json()
    tool_id = data.get('tool_id')
    
    if tool_id not in game_data['tools']:
        return jsonify({'success': False, 'message': '존재하지 않는 도구입니다.'}), 400
    
    tool = game_data['tools'][tool_id]
    
    # 도구를 보유하지 않은 경우
    if not tool['owned']:
        return jsonify({'success': False, 'message': '보유하지 않은 도구입니다.'}), 400
    
    # 도구 장착
    game_data['current_tool'] = tool_id
    game_data['damage'] = tool['damage']
    
    return jsonify({
        'success': True,
        'current_tool': tool_id,
        'damage': game_data['damage']
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

