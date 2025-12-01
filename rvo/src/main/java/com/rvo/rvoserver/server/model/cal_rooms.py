import pulp
import json
import re
import sys

def extract_numbers(s):
    return re.findall(r'\d+', s)

#  dataPath文件路径,r_info房间,m_info和集合点信息,DistanceMatrix权重矩阵
def readData(dataPath, r_information, m_information, DistanceMatrix):
    # 打开并读取JSON文件
    with open(dataPath, 'r') as file:
        data = json.load(file)

    # 为r_information添加id并扩展
    r_id = 1
    for item in data.get('3', []):
        r_information.append({'id': r_id, 'value': item})
        r_id += 1

    # 为m_information添加id并扩展
    m_id = 1
    for item in data.get('4', []):
        m_information.append({'id': m_id, 'value': item})
        m_id += 1

    # 距离矩阵直接赋值，假设其格式为二维列表
    DistanceMatrix = data.get('5', [])
    return DistanceMatrix

def BuildModel(r_information, m_information, DistanceMatrix, result):
    M = 100000  # 大M法中的M值
    prob = pulp.LpProblem("Evacuation_Model", pulp.LpMinimize)

    # 创建变量
    x = pulp.LpVariable.dicts("RouteFlow", ((i['id'], j['id']) for i in r_information for j in m_information), lowBound=0, cat='Continuous')
    y = pulp.LpVariable.dicts("Selection", ((i['id'], j['id']) for i in r_information for j in m_information), cat='Binary')

    # 添加目标函数
    prob += pulp.lpSum(DistanceMatrix[i['id']-1][j['id']-1] * x[(i['id'], j['id'])] for i in r_information for j in m_information)

    # 添加约束条件
    for i in r_information:
        prob += pulp.lpSum(y[(i['id'], j['id'])] for j in m_information) >= 1, f"Each_room_must_be_evacuated_{i['id']}"

    for i in r_information:
        for j in m_information:
            prob += x[(i['id'], j['id'])] <= M * y[(i['id'], j['id'])], f"RouteFlow_Limit_{i['id']}_{j['id']}"

    for i in r_information:
        prob += pulp.lpSum(x[(i['id'], j['id'])] for j in m_information) == i['value'], f"Total_evacuees_from_room_{i['id']}"

    for j in m_information:
        prob += pulp.lpSum(x[(i['id'], j['id'])] for i in r_information) <= j['value'], f"Capacity_limit_of_exit_{j['id']}"

    # 求解问题
    prob.solve()

    # 输出结果
    for v in prob.variables():
        if v.name.startswith('Selection_') and v.varValue > 0:
            # 提取id
            parts = v.name.split('_')
            i_id = int(extract_numbers(parts[1])[0])
            j_id = int(extract_numbers(parts[2])[0])
            if v.varValue > 0:
                result[(i_id, j_id)] = pulp.value(x[(i_id, j_id)])

def output(result,projectPath,r_num,m_num):
    # 构建文件路径
    output_file_path = projectPath + "/output.json"
    result_array = [[result[(i, j)] for j in range(1, m_num+1)] for i in range(1, r_num+1)]
    # 将result_array转换为JSON格式的字符串
    result_array_json = json.dumps(result_array, indent=4, sort_keys=True)
    # 将JSON字符串写入文件
    with open(output_file_path, 'w', encoding='utf-8') as file:
        file.write(result_array_json)



if __name__ == "__main__":
    project_url = sys.argv[-1]
    r_num = 0
    m_num = 0
    r_information = []
    m_information = []
    DistanceMatrix = []
    result = {}
    DistanceMatrix = readData(project_url+"model_data.json", r_information, m_information, DistanceMatrix)
    BuildModel(r_information, m_information, DistanceMatrix, result)
    r_num = len(r_information)
    m_num = len(m_information)
    output(result,project_url,r_num,m_num)


