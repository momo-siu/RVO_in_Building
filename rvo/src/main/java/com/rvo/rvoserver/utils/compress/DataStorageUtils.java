package com.rvo.rvoserver.utils.compress;

import java.util.*;

public class DataStorageUtils {

    private static final Map<Character, String> Codes = new HashMap<Character, String>(){{
        put('0',"000");
        put('1',"001");
        put('2',"010");
        put('3',"0110");
        put('4',"0111");
        put('5',"1000");
        put('6',"1001");
        put('7',"1010");
        put('8',"1011");
        put('9',"1100");
        put('\n',"1101");
        put('.',"1110");
        put(' ',"1111");
    }};

    private static final HuffmanTree huffmanTree = new HuffmanTree(Codes);

    public static int storeData(List<List<Map<String, Double>>> data, String path) {
//        for(List<Map<String, Double>>)
        return 0;
    }

    public static byte[] toBytes(String data) {
        char[] dataCharArray = data.toCharArray();
        StringBuilder codes = new StringBuilder();
        for(char c : dataCharArray) {
            codes.append(Codes.get(c));
        }
        String code = codes.toString();

//        System.out.println(code);

        //在末尾补零凑齐8的倍数
        int numOfZero = 8 - code.length() % 8;
        String zeros = "0".repeat(numOfZero);
        code = code + zeros;

        //将字符串转为字节列表
        List<Byte> byteList = new ArrayList<>();
        for(int i = 0; i < code.length() / 8; i++) {
            byte b = (byte) Integer.parseInt(code.substring(i * 8, (i + 1) * 8), 2);
            byteList.add(b);
        }

        //将字节列表转换为字节数组
        byte[] res = new byte[1 + byteList.size()];
        //将补零的个数转为字节并写入
        res[0] = (byte) numOfZero;
        for(int i = 0; i < byteList.size(); i++) {
            res[i + 1] = byteList.get(i);
        }

        return res;
    }

    public static String byteToString(byte[] bytes) {
        if(bytes.length == 0) { return ""; }
        int len = bytes.length;

        //将字节数组转为字符串
        StringBuilder codes = new StringBuilder();
        for(int i = 1; i < len; i++) {
            String code = Integer.toBinaryString(bytes[i] & 0xFF);

//            System.out.println(bytes[i] + ":" + code);

            //补零
            if(code.length() < 8) {
                codes.append("0".repeat(8 - code.length()));
            }
            codes.append(code);
        }

        //将结尾凑8时补的零去掉
        String sourceCode = codes.toString();
        sourceCode = sourceCode.substring(0, sourceCode.length() - bytes[0]);

//        System.out.println(sourceCode);

        //将二进制串转为字符串
        return huffmanTree.getString(sourceCode);
    }

    public static void main(String[] args) {
        byte[] bytes = toBytes("123 4564.56 454456");
        System.out.println(Arrays.toString(bytes));
        System.out.println(byteToString(bytes));
    }

}
