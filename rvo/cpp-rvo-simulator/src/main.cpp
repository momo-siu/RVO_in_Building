#include <iostream>
#include <string>
#include "simulator.h"

int main(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "Usage: " << argv[0] << " <input.json> <output_dir>" << std::endl;
        return 1;
    }

    std::string inputFile = argv[1];
    std::string outputDir = argv[2];

    rvocpp::RVOSimulator simulator;
    simulator.setOutputDir(outputDir);
    
    // 标记：开始读入数据
    std::cout << "[STAGE] loading" << std::endl;

    // 从JSON加载配置
    if (!simulator.loadFromJSON(inputFile)) {
        std::cerr << "Failed to load configuration from " << inputFile << std::endl;
        return 1;
    }

    // 标记：开始计算方案
    std::cout << "[STAGE] running" << std::endl;

    // 运行模拟
    if (!simulator.run()) {
        std::cerr << "Simulation failed" << std::endl;
        return 1;
    }

    // 标记：开始保存结果
    std::cout << "[STAGE] saving" << std::endl;

    // 保存结果
    if (!simulator.saveResults()) {
        std::cerr << "Failed to save results" << std::endl;
        return 1;
    }

    std::cout << "[STAGE] done" << std::endl;
    std::cout << "Simulation completed successfully" << std::endl;
    return 0;
}

