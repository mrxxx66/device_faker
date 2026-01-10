#!/usr/bin/env python3
"""
打包 Magisk 模块脚本
将 module/ 目录打包为可安装的 ZIP 文件
"""

import os
import zipfile
import re

def convert_to_lf(file_path):
    """将文件转换为 LF 换行符"""
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # 将 CRLF 转换为 LF
    content = content.replace(b'\r\n', b'\n')
    
    with open(file_path, 'wb') as f:
        f.write(content)

def get_version_from_prop():
    """从 module.prop 文件中读取版本号"""
    prop_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "module", "module.prop")
    if not os.path.exists(prop_file_path):
        raise FileNotFoundError(f"module.prop not found at {prop_file_path}")
    
    with open(prop_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        # 使用正则表达式查找版本号
        version_match = re.search(r'^version=(.+)$', content, re.MULTILINE)
        if version_match:
            version = version_match.group(1).strip()
            # 移除可能的 "v" 前缀
            return version.lstrip('vV')
        else:
            raise ValueError("Version not found in module.prop")

def create_magisk_module_zip():
    """创建 Magisk 模块 ZIP 包"""
    project_root = os.path.dirname(os.path.abspath(__file__))
    module_dir = os.path.join(project_root, "module")
    output_dir = os.path.join(project_root, "output")
    
    # 创建 output 目录（如果不存在）
    os.makedirs(output_dir, exist_ok=True)
    
    # 从 module.prop 获取版本号
    try:
        version = get_version_from_prop()
        zip_filename = f"device_faker-v{version}.zip"
        print(f"检测到版本: v{version}")
    except (FileNotFoundError, ValueError) as e:
        print(f"读取版本号失败: {e}, 使用默认文件名")
        # 如果读取版本失败，回退到时间戳
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"device_faker_{timestamp}.zip"
    
    # 转换所有 .sh 文件为 LF 换行符
    print("正在处理 .sh 文件换行符...")
    for root, dirs, files in os.walk(module_dir):
        for file in files:
            if file.endswith('.sh'):
                file_path = os.path.join(root, file)
                convert_to_lf(file_path)
                print(f"  转换: {os.path.relpath(file_path, module_dir)}")
    
    zip_path = os.path.join(output_dir, zip_filename)
    
    print(f"\n开始打包 Magisk 模块...")
    print(f"输出文件: {zip_filename}")
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # 遍历 module 目录
        for root, dirs, files in os.walk(module_dir):
            for file in files:
                file_path = os.path.join(root, file)
                # 计算相对路径（相对于 module 目录）
                arcname = os.path.relpath(file_path, module_dir)
                
                zipf.write(file_path, arcname)
                print(f"  添加: {arcname}")
    
    # 获取文件大小
    file_size = os.path.getsize(zip_path)
    size_mb = file_size / (1024 * 1024)
    
    print(f"\n✅ 打包完成！")
    print(f"📦 文件: output/{zip_filename}")
    print(f"📏 大小: {size_mb:.2f} MB")
    print(f"\n请将此 ZIP 文件通过root管理器安装")

if __name__ == "__main__":
    create_magisk_module_zip()