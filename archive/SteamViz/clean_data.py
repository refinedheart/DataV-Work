import pandas as pd
import json

# --- 设计师配置 ---
INPUT_FILE = 'steam.csv' 
OUTPUT_FILE = 'steam_data_sampled.json'

def clean_and_sample_data():
    print("🎨 正在进行数据清洗与艺术采样...")
    
    try:
        df = pd.read_csv(INPUT_FILE)
    except FileNotFoundError:
        print("❌ 找不到 steam.csv")
        return

    # 1. 基础清洗 (同前)
    df['total_ratings'] = df['positive_ratings'] + df['negative_ratings']
    df = df[df['total_ratings'] >= 20].copy() # 门槛稍微放低，允许更多独立游戏进入采样池
    df['positive_rate'] = df['positive_ratings'] / df['total_ratings']
    df['release_date'] = pd.to_datetime(df['release_date'], errors='coerce')
    df['year'] = df['release_date'].dt.year
    df = df.dropna(subset=['year'])
    df['year'] = df['year'].astype(int)
    df['genres'] = df['genres'].fillna('').apply(lambda x: x.split(';') if x else [])

    # 2. ⚡ 分层采样 (Stratified Sampling) - 核心改动
    
    # 定义“热门游戏”阈值 (例如评论数 > 2000)
    hot_threshold = 2000
    
    # 拆分数据
    df_hot = df[df['total_ratings'] >= hot_threshold]
    df_normal = df[df['total_ratings'] < hot_threshold]
    
    print(f"热门游戏数量 (保留100%): {len(df_hot)}")
    print(f"普通游戏数量 (原始): {len(df_normal)}")
    
    # 对普通游戏进行随机采样 (例如只取 5% 或者固定取 1500 个)
    # random_state=42 保证每次运行脚本采样的结果是一样的，保证复现性
    df_normal_sampled = df_normal.sample(frac=0.05, random_state=42) 
    
    print(f"普通游戏采样后: {len(df_normal_sampled)}")
    
    # 合并数据
    df_final = pd.concat([df_hot, df_normal_sampled])
    
    # 打乱顺序，防止热门游戏全堆在数组前面
    df_final = df_final.sample(frac=1, random_state=42).reset_index(drop=True)

    # 3. 字段瘦身
    selected_columns = ['name', 'year', 'price', 'positive_rate', 'total_ratings', 'genres']
    df_clean = df_final[selected_columns]

    # 导出
    json_data = df_clean.to_json(orient='records', force_ascii=False)
    parsed = json.loads(json_data)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(parsed, f, ensure_ascii=False, indent=2)

    print(f"✨ 采样完成！最终数据量: {len(df_clean)} 条。")
    print(f"文件已保存为: {OUTPUT_FILE}")

if __name__ == "__main__":
    clean_and_sample_data()