package com.rvo.rvoserver.utils.compress;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Map;

@Data
@AllArgsConstructor
class TreeNode {
    int type; //节点数
    char c;
    TreeNode oneNode;
    TreeNode zeroNode;

    public TreeNode() {
        type = 0;
        oneNode = null;
        zeroNode = null;
    }

    public void initOne() {
        oneNode = new TreeNode();
    }

    public void initZero() {
        zeroNode = new TreeNode();
    }
}

public class HuffmanTree {
    private TreeNode huffmanTreeHead;

    public HuffmanTree() {
        huffmanTreeHead = new TreeNode();
    }

    public HuffmanTree(Map<Character, String> codes) {
        huffmanTreeHead = new TreeNode();
        for(char c : codes.keySet()) {
            addNode(c, codes.get(c));
        }
    }

    //添加节点
    public boolean addNode(char c, String codes) {
        char[] code = codes.toCharArray();
        TreeNode node = huffmanTreeHead;
        for(char b : code) {
            if(b == '0') {
                node.type = 1;
                if(node.zeroNode == null) {
                    node.initZero();
                }
                node = node.zeroNode;
            } else if (b == '1') {
                node.type = 1;
                if(node.oneNode == null) {
                    node.initOne();
                }
                node = node.oneNode;
            } else {
                return false;
            }
        }
        node.setC(c);
        return true;
    }

    public String getString(String codes) {
        StringBuilder res = new StringBuilder();
        char[] code = codes.toCharArray();
        TreeNode node = huffmanTreeHead;
        for(char b : code) {
            if(b == '0') {
                node = node.zeroNode;
                if(node == null) {
                    return res.toString();
                }
                if(node.type == 0) {
                    res.append(node.c);
                    node = huffmanTreeHead;
                }
            } else if (b == '1') {
                node = node.oneNode;
                if(node == null) {
                    return res.toString();
                }
                if(node.type == 0) {
                    res.append(node.c);
                    node = huffmanTreeHead;
                }
            } else {
                return res.toString();
            }
        }
        return res.toString();
    }
}
