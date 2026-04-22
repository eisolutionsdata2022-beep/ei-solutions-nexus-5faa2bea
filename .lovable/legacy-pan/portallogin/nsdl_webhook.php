<?php
require_once('../database/config.php');

$response = file_get_contents('php://input');

    $response = json_decode($response,true);
    $ach = $response['Transactions']['AckNo'];
    $StatusCode = $response['StatusCode'];
    $Message = $response['Message'];
    $Number = $response['Transactions']['Number'];
    $OrderID = $response['Transactions']['OrderID'];
    $Status = $response['Transactions']['Status'];
    $AgentID = $response['AgentID'];
    $TxnId = $response['TxnId'];
    $Type = $response['Type'];
    if($Type=='Y'){
        $cup_type='p_nsdl';
    }else{
        $cup_type='e_nsdl';
    }
    $api_id = explode('_',$AgentID);
    $agent_username = $api_id['0'];
    
      if($StatusCode=="1"){
$chk_sql = $conn->prepare("select * from ekycpancard WHERE order_id = ?");
$chk_sql->execute([$TxnId]);
$ekycpancardData=$chk_sql->fetch();  

if($ekycpancardData['status']=="Pending"){
    
    
    $sqlu = $conn->query("UPDATE ekycpancard SET encrypted_data='".json_encode($response)."', ack_no='".$ach."', remark='".$Message."', status='Success' WHERE order_id='".$TxnId."' ");
if($sqlu->execute()){
   // echo $agent_username;//'Done'; 
    
    $sql = $conn->prepare("select * from loginusers WHERE nsdl_id = ?");
$sql->execute([$agent_username]);
$udata=$sql->fetch();

///---------start commission part------------------//

$udata=$udata;

$disql = $conn->prepare("select * from loginusers WHERE username = ?");
$disql->execute([$udata['createby']]);
$dis_data=$disql->fetch();

$susql = $conn->prepare("select * from loginusers WHERE username = ?");
$susql->execute([$dis_data['createby']]);
$sup_data=$susql->fetch();

$wlsql = $conn->prepare("select * from loginusers WHERE username = ?");
$wlsql->execute([$sup_data['createby']]);
$wl_data=$wlsql->fetch();

$mwlsql = $conn->prepare("select * from loginusers WHERE username = ?");
$mwlsql->execute([$wl_data['createby']]);
$mwl_data=$mwlsql->fetch();

//$cup_type = "p_nsdl";
$orderId=$TxnId;

if($dis_data['id']>0){
    
$dcom = $udata[$cup_type] - $dis_data[$cup_type];
//$tcom = $rcom;
if($udata[$cup_type]<95){
       $dcom = 0;
    }
    if($dis_data[$cup_type]<95){
        $dcom = 0;
    }

if($dcom>0){
$total_credit = $dis_data['balance'] + $dcom;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$dis_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'NSDL EKYC PAN Commission:  - '.$orderId;
$status = 'success';
$reference = 'TXN'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $dis_data['username']);
$txn->bindParam(":bank", $udata['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount",$dcom);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $ach);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
if($txn->execute()){
    echo 'Dis Comm '.$dcom;
}

}
}

if($sup_data['id']>0){
    
$scom = $dis_data[$cup_type] - $sup_data[$cup_type];
//$tcom = $rcom;
if($dis_data[$cup_type]<95){
        $scom = 0;
    }
    if($sup_data[$cup_type]<95){
        $scom = 0;
    }

if($scom>0){
$total_credit = $sup_data['balance'] + $scom;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$sup_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'NSDL EKYC PAN Commission: '.$ekycpancardData['name'].' - '.$orderId;
$status = 'success';
$reference = 'TXN'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $sup_data['username']);
$txn->bindParam(":bank", $dis_data['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount",$scom);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $ach);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
if($txn->execute()){
    echo 'SDis Comm '.$scom;
}	
}
}

if($wl_data['id']>0){
    
$wcom = $sup_data[$cup_type] - $wl_data[$cup_type];	
//$tcom = $rcom;
if($sup_data[$cup_type]<95){
        $wcom=0;
    }
    if($wl_data[$cup_type]<95){
        $wcom=0;
    }
if($wcom>0){
$total_credit = $wl_data['balance'] + $wcom;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$wl_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'NSDL EKYC PAN Commission: '.$ekycpancardData['name'].' - '.$orderId;
$status = 'success';
$reference = 'TXN'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $wl_data['username']);
$txn->bindParam(":bank", $sup_data['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount",$wcom);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $ach);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
if($txn->execute()){
    echo 'wl Comm '.$wcom;
}	
}
}

if($mwl_data['id']>0){
    
$mwl = $wl_data[$cup_type] - $mwl_data[$cup_type];	
//$tcom = $rcom;
if($wl_data[$cup_type]>95){
        $mwl = 0;
    }
    if($mwl_data[$cup_type]>95){
        $mwl=0;
    }
if($mwl>0){
$total_credit = $mwl_data['balance'] + $mwl;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?  WHERE id=?");
$sqlu->execute([$total_credit,$mwl_data['id']]);	

$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'COMMISSION';	
$type = 'credit';
$remark = 'NSDL EKYC PAN Commission: '.$ekycpancardData['name'].' - '.$orderId;
$status = 'success';
$reference = 'TXN'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $mwl_data['username']);
$txn->bindParam(":bank", $wl_data['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount",$mwl);
$txn->bindParam(":balance", $total_credit);
$txn->bindParam(":reference", $ach);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
if($txn->execute()){
    echo 'adm Comm '.$mwl;
}	
}
} 

///---------end commission part------------------//    
  
}//if($ekycpancardData['status']=="Pending")
}///end of if($sqlu->execute()
}///end of if($StatusCode=="1")

if($StatusCode=="0"){
    $chk_sql = $conn->prepare("select * from ekycpancard WHERE order_id = ?");
$chk_sql->execute([$TxnId]);
$ekycpancardData=$chk_sql->fetch();  
$n_username = $ekycpancardData['username'];
$n_amount = $ekycpancardData['amount'];

$luser = $conn->prepare("select * from loginusers WHERE username = ?");
$luser->execute([$n_username]);
$luserdata=$luser->fetch(); 
$old_bal = $luserdata['balance'];
$new_bal = $old_bal+$n_amount;

if($ekycpancardData['status']=="Pending"){
    
    
    $sqlu = $conn->prepare("UPDATE ekycpancard SET encrypted_data='".json_encode($response)."', ack_no='".$ach."', remark='".$Message."', status='Failed' WHERE order_id='".$TxnId."' ");
if($sqlu->execute()){
    $usrupdt = $conn->prepare("UPDATE loginusers SET balance = '".$new_bal."' WHERE username = '".$n_username."'");
    if($usrupdt->execute()){

     $mode = 'NSDL';	
$type = 'credit';
$remark = 'Refund nsdl pending: '.$order_id.' - '.$qr['owner_name'];
$status = 'success';
$reference = 'NSDL'.$order_id;
$date_time = date('Y-m-d h:i:s');

    $txnsql = $conn->prepare("INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`,`orderid`)
 VALUES ('".$date_time."','".$n_username."','".$n_username."','".$mode."','".$type."','".$n_amount."','".$new_bal."','".$reference."','".$remark."','".$status."','".$order_id."')");

$txnsql->execute();

}
}
}
}
?>